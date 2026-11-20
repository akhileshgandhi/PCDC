// Anti-cheating guards for the student portal: no selecting, copying or
// pasting, and no text that browser extensions type or insert.
//
// "Enable copy" and highlighter extensions defeat a plain page block by
// replacing the browser functions the page uses (addEventListener,
// preventDefault, getSelection...). So the guards here call untouched copies
// of those functions, taken from a hidden blank frame, and report a page
// whose functions were replaced as an extension (see hasExtensionTraces).
// A web page still can't stop every extension; ProtectedText makes whatever
// is copied or read from case text unusable.

/** Testing escape hatch: VITE_ALLOW_STUDENT_CLIPBOARD=true in a local
 * .env.local turns all student copy/paste and extension guards off. */
export const ALLOW_STUDENT_CLIPBOARD = import.meta.env.VITE_ALLOW_STUDENT_CLIPBOARD === "true"

/** Typing, autocorrect and IME input add a few characters per change. More
 * than this in a single change means the text was inserted, not typed. */
export const MAX_INSERT_CHARS = 20

export const BLOCKED_EVENT = "student-guard:blocked"

export const BLOCKED_MESSAGES = {
  insert: "Pasted or inserted text isn't allowed. Please type your answer.",
  copy: "Copying is turned off for students.",
  paste: "Pasting is turned off for students. Please type your answer.",
  rightClick: "Right-click is turned off for students.",
}

export type FullscreenEvent = "enter" | "exit"

/** The server's full-screen count for an attempt. `counted` is true when this
 * report added an exit; `ended` is true once the attempt is over. */
export interface FullscreenStatus {
  exits: number
  max_exits: number
  counted: boolean
  ended: boolean
}

/** Tell the page that something was blocked, so it can show `message`. */
export function notifyBlocked(message: string = BLOCKED_MESSAGES.insert) {
  window.dispatchEvent(new CustomEvent<string>(BLOCKED_EVENT, { detail: message }))
}

// ---------------------------------------------------------------------------
// Untouched browser functions

type Listener = (event: Event) => void

interface Natives {
  on: (target: EventTarget, type: string, listener: Listener, capture: boolean) => void
  off: (target: EventTarget, type: string, listener: Listener, capture: boolean) => void
  prevent: (event: Event) => void
  stop: (event: Event) => void
  stopNow: (event: Event) => void
  selection: () => Selection | null
  clearSelection: (selection: Selection) => void
  isCollapsed: (selection: Selection) => boolean
  anchorNode: (selection: Selection) => Node | null
  focusNode: (selection: Selection) => Node | null
  every: (fn: () => void, ms: number) => number
  cancelEvery: (id: number) => void
  isNative: (fn: unknown) => boolean
}

let nativeFrame: HTMLIFrameElement | null = null
let cachedNatives: Natives | null = null

function getter<T>(proto: object, name: string) {
  return Object.getOwnPropertyDescriptor(proto, name)?.get as ((this: unknown) => T) | undefined
}

/** Browser functions from a fresh blank frame, which page-level patches by
 * an extension don't reach. Falls back to this page's own functions. */
function natives(): Natives {
  if (cachedNatives && nativeFrame?.isConnected) return cachedNatives
  let w: (Window & typeof globalThis) | null = null
  try {
    nativeFrame = document.createElement("iframe")
    nativeFrame.setAttribute("aria-hidden", "true")
    nativeFrame.tabIndex = -1
    nativeFrame.style.display = "none"
    document.documentElement.appendChild(nativeFrame)
    w = nativeFrame.contentWindow as (Window & typeof globalThis) | null
  } catch {
    w = null
  }
  const g = w ?? window
  const et = g.EventTarget.prototype
  const ev = g.Event.prototype
  const sel = g.Selection.prototype
  const doc = g.Document.prototype
  const fnToString = g.Function.prototype.toString
  const collapsed = getter<boolean>(sel, "isCollapsed")
  const anchor = getter<Node | null>(sel, "anchorNode")
  const focus = getter<Node | null>(sel, "focusNode")
  const setTimer = g.setInterval.bind(g)
  const clearTimer = g.clearInterval.bind(g)
  cachedNatives = {
    on: (target, type, listener, capture) => et.addEventListener.call(target, type, listener, capture),
    off: (target, type, listener, capture) => et.removeEventListener.call(target, type, listener, capture),
    prevent: (event) => ev.preventDefault.call(event),
    stop: (event) => ev.stopPropagation.call(event),
    stopNow: (event) => ev.stopImmediatePropagation.call(event),
    selection: () => doc.getSelection.call(document),
    clearSelection: (selection) => sel.removeAllRanges.call(selection),
    isCollapsed: (selection) => (collapsed ? collapsed.call(selection) : selection.isCollapsed),
    anchorNode: (selection) => (anchor ? anchor.call(selection) : selection.anchorNode),
    focusNode: (selection) => (focus ? focus.call(selection) : selection.focusNode),
    every: (fn, ms) => setTimer(fn, ms),
    cancelEvery: (id) => clearTimer(id),
    isNative: (fn) => {
      try {
        return typeof fn === "function" && /\{\s*\[native code\]\s*\}\s*$/.test(fnToString.call(fn))
      } catch {
        return false
      }
    },
  }
  return cachedNatives
}

/** True when an extension has replaced browser functions the guards rely on. */
function pageFunctionsReplaced(): boolean {
  const n = natives()
  const used: unknown[] = [
    EventTarget.prototype.addEventListener,
    EventTarget.prototype.removeEventListener,
    Event.prototype.preventDefault,
    Event.prototype.stopPropagation,
    Event.prototype.stopImmediatePropagation,
    Document.prototype.getSelection,
    window.getSelection,
    Selection.prototype.removeAllRanges,
    Selection.prototype.addRange,
    getter(Event.prototype, "defaultPrevented"),
  ]
  return used.some((fn) => !n.isNative(fn))
}

/** Adds capture-phase window listeners through the untouched functions.
 * Returns a cleanup function. */
function listen(target: EventTarget, handlers: Record<string, Listener>): () => void {
  const n = natives()
  for (const [type, listener] of Object.entries(handlers)) n.on(target, type, listener, true)
  return () => {
    for (const [type, listener] of Object.entries(handlers)) n.off(target, type, listener, true)
  }
}

// ---------------------------------------------------------------------------
// Typing guard

type TextField = HTMLTextAreaElement | HTMLInputElement
const TEXT_INPUT_TYPES = new Set(["text", "search"])

function asTextField(target: EventTarget | null): TextField | null {
  if (target instanceof HTMLTextAreaElement) return target
  if (target instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(target.type)) return target
  return null
}

function isEditable(target: EventTarget | null) {
  return asTextField(target) !== null || (target instanceof HTMLElement && target.isContentEditable)
}

/**
 * Guards every text box on the page:
 * - ignores key and input events made by a script (isTrusted is false), so an
 *   extension can't "type" into a field;
 * - puts a text box back to its last typed value when a lot of text appears
 *   in one change, or when an extension changes it without a real keystroke.
 * Listeners run on window in the capture phase, before React and ProseMirror.
 * Returns a cleanup function.
 */
export function installInputGuard(): () => void {
  const n = natives()
  // The last value each text box had from real typing (or when it got focus,
  // which also picks up drafts the app loaded or values it cleared).
  const lastValue = new WeakMap<TextField, string>()

  const restore = (field: TextField, event: Event) => {
    const previous = lastValue.get(field) ?? ""
    field.value = previous
    try {
      field.setSelectionRange(previous.length, previous.length)
    } catch {
      // Some input types don't support selection; the value is what matters.
    }
    n.stopNow(event)
    notifyBlocked()
  }

  const blockFake = (event: Event) => {
    if (event.isTrusted || !isEditable(event.target)) return
    n.prevent(event)
    n.stopNow(event)
    if (event.type === "beforeinput") notifyBlocked()
  }

  return listen(window, {
    focusin: (event) => {
      const field = asTextField(event.target)
      if (field) lastValue.set(field, field.value)
    },
    keydown: blockFake,
    keypress: blockFake,
    keyup: blockFake,
    beforeinput: blockFake,
    input: (event) => {
      const field = asTextField(event.target)
      if (!field) return
      if (!lastValue.has(field)) {
        // No baseline yet (the field never had focus): only real input sets one.
        if (event.isTrusted) lastValue.set(field, field.value)
        else n.stopNow(event)
        return
      }
      const inputType = event instanceof InputEvent ? event.inputType : ""
      const isUndoRedo = inputType === "historyUndo" || inputType === "historyRedo"
      const grew = field.value.length - (lastValue.get(field) ?? "").length
      if (!event.isTrusted || (grew > MAX_INSERT_CHARS && !isUndoRedo)) {
        restore(field, event)
        return
      }
      lastValue.set(field, field.value)
    },
  })
}

// ---------------------------------------------------------------------------
// Copy guard

const GUARD_CLASS = "student-copy-guard"
const GUARD_STYLE_ID = "student-copy-guard-style"
// Only fields the student can type in. Read-only and locked ones (a submitted
// answer, shown case text) count as page text and can't be selected.
const EDITABLE =
  'input:not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled]), [contenteditable="true"], [contenteditable=""]'
// Selectors are more specific than the `* { user-select: text !important }`
// rule that "allow copy" extensions add, so ours still wins.
const GUARD_CSS = `
body.${GUARD_CLASS} *:not(${EDITABLE}):not(:is(${EDITABLE}) *) {
  -webkit-user-select: none !important;
  user-select: none !important;
  -webkit-touch-callout: none !important;
}
@media print {
  body.${GUARD_CLASS} > * { display: none !important; }
  body.${GUARD_CLASS}::after { content: "Printing is turned off for students."; }
}
`
const SWEEP_MS = 300
// Ctrl/Cmd + C copy, V paste, X cut, P print, S save page, U view source.
const BLOCKED_SHORTCUTS = new Set(["c", "v", "x", "p", "s", "u"])
// Inline styles beat any style sheet, so extensions turn selection back on
// with them; the sweep strips them.
const INLINE_SELECT = '[style*="user-select"]'

function insideEditable(node: Node | null) {
  const el = node instanceof Element ? node : node?.parentElement
  return Boolean(el?.closest(EDITABLE))
}

function addGuardStyle() {
  if (document.getElementById(GUARD_STYLE_ID)) return
  const style = document.createElement("style")
  style.id = GUARD_STYLE_ID
  style.textContent = GUARD_CSS
  document.head.appendChild(style)
}

/**
 * Stops students selecting, copying, printing or saving the page text
 * (case text, questions, data). Answer boxes and the memo editor can still be
 * selected for editing, but copy, cut and paste are blocked everywhere.
 * - Listeners sit on window in the capture phase and use untouched browser
 *   functions, so an extension that replaces them doesn't switch them off.
 * - A copy that slips through puts an empty string on the clipboard.
 * - Any selection outside an answer box is cleared, both on selectionchange
 *   and on a timer, so blocking the event doesn't help an extension.
 * - The no-select style is put back, and inline styles that turn selection
 *   on are removed, if something changes them.
 * Returns a cleanup function.
 */
export function installCopyGuard(): () => void {
  const n = natives()

  const blockCopy = (event: Event) => {
    n.prevent(event)
    if (event instanceof ClipboardEvent) {
      event.clipboardData?.setData("text/plain", "")
      event.clipboardData?.setData("text/html", "")
    }
    notifyBlocked(BLOCKED_MESSAGES.copy)
  }

  // BLOCKED_SHORTCUTS everywhere (answer boxes included), Ctrl/Cmd + A
  // (select all) outside answer boxes, and the older Windows/Linux keys
  // Ctrl+Insert (copy), Shift+Insert (paste) and Shift+Delete (cut).
  // Ctrl on Windows/Linux and Cmd on Mac. Paste from the browser menu is
  // caught by the paste listener.
  const blockShortcuts = (event: Event) => {
    if (!(event instanceof KeyboardEvent)) return
    const key = event.key?.toLowerCase() ?? ""
    const legacy = (key === "insert" && (event.ctrlKey || event.shiftKey)) || (key === "delete" && event.shiftKey)
    const modifier = event.ctrlKey || event.metaKey
    const selectAllOutside = modifier && key === "a" && !insideEditable(event.target as Node | null)
    if (!((modifier && BLOCKED_SHORTCUTS.has(key)) || selectAllOutside || legacy)) return
    n.prevent(event)
    n.stop(event)
    const isPaste = (modifier && key === "v") || (key === "insert" && event.shiftKey)
    const isCopy = (modifier && (key === "c" || key === "x")) || legacy
    if (isPaste) notifyBlocked(BLOCKED_MESSAGES.paste)
    else if (isCopy) notifyBlocked(BLOCKED_MESSAGES.copy)
  }

  const clearSelection = () => {
    const selection = n.selection()
    if (!selection || n.isCollapsed(selection)) return
    if (insideEditable(document.activeElement)) return
    if (insideEditable(n.anchorNode(selection)) && insideEditable(n.focusNode(selection))) return
    n.clearSelection(selection)
  }

  const sweep = () => {
    clearSelection()
    addGuardStyle()
    document.body.classList.add(GUARD_CLASS)
    for (const el of document.querySelectorAll<HTMLElement>(INLINE_SELECT)) {
      el.style.removeProperty("user-select")
      el.style.removeProperty("-webkit-user-select")
    }
  }

  const removeWindowListeners = listen(window, {
    copy: blockCopy,
    cut: blockCopy,
    paste: (event) => {
      n.prevent(event)
      notifyBlocked(BLOCKED_MESSAGES.paste)
    },
    // Covers the mouse's right button, the keyboard Menu key and Shift+F10,
    // so the browser's Copy / Paste menu never opens.
    contextmenu: (event) => {
      n.prevent(event)
      notifyBlocked(BLOCKED_MESSAGES.rightClick)
    },
    dragstart: (event) => n.prevent(event),
    selectstart: (event) => {
      if (!insideEditable(event.target as Node | null)) n.prevent(event)
    },
    keydown: blockShortcuts,
  })
  const removeDocumentListeners = listen(document, { selectionchange: clearSelection })
  sweep()
  const timer = n.every(sweep, SWEEP_MS)

  return () => {
    removeWindowListeners()
    removeDocumentListeners()
    natives().cancelEvery(timer)
    document.body.classList.remove(GUARD_CLASS)
    document.getElementById(GUARD_STYLE_ID)?.remove()
  }
}

// ---------------------------------------------------------------------------
// Extension detection

const EXTENSION_URL = /^(chrome|moz|safari-web|ms-browser)-extension:/i
// Custom elements our own tooling may add to the page.
const KNOWN_CUSTOM_TAGS = new Set(["vite-error-overlay"])

/**
 * Looks for marks extensions leave on the page:
 * - Grammarly's attributes and elements, and files loaded from an extension;
 * - custom elements, <mark> highlights, CSS highlights or shadow-DOM elements
 *   (the app uses none of these);
 * - inline styles that turn text selection back on;
 * - browser functions the guards rely on, replaced by a script.
 * Returns true when an extension seems to be active.
 */
export function hasExtensionTraces(): boolean {
  if (document.querySelector("[data-gramm], [data-gramm_editor], grammarly-desktop-integration, grammarly-extension")) {
    return true
  }
  if (document.querySelector(`#root mark, ${INLINE_SELECT}`)) return true
  for (const el of document.querySelectorAll("[src], link[href]")) {
    const url = el.getAttribute("src") ?? el.getAttribute("href") ?? ""
    if (EXTENSION_URL.test(url)) return true
  }
  const highlights = (globalThis.CSS as unknown as { highlights?: { size: number } } | undefined)?.highlights
  if (highlights && highlights.size > 0) return true
  for (const el of document.querySelectorAll("body *")) {
    if (el instanceof SVGElement) continue
    const tag = el.tagName.toLowerCase()
    if ((tag.includes("-") && !KNOWN_CUSTOM_TAGS.has(tag)) || el.shadowRoot !== null) return true
  }
  return pageFunctionsReplaced()
}
