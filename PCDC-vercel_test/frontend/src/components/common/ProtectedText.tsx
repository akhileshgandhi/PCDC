import { Fragment, useMemo } from "react"
import type { CSSProperties, ReactNode } from "react"

import { getUserRole } from "../../utils/auth"
import { ALLOW_STUDENT_CLIPBOARD } from "../../utils/studentGuard"

// Invisible and zero-width, but still part of the page text, so a copy, a
// page read by an extension or an AI sidebar picks it up. No user-select
// here: that would leave it out of a copy.
const DECOY_STYLE: CSSProperties = {
  fontSize: 0,
  lineHeight: 0,
  letterSpacing: 0,
  color: "transparent",
}
const LETTERS = "bcdfghjklmnpqrstvwxz"
const MIN_WORD = 4

/** Small seeded random generator, so the same text always gets the same decoys. */
function seededRandom(text: string) {
  let seed = 2166136261
  for (let i = 0; i < text.length; i += 1) seed = Math.imul(seed ^ text.charCodeAt(i), 16777619)
  return () => {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507) ^ Math.imul(seed ^ (seed >>> 13), 3266489909)
    return ((seed ^= seed >>> 16) >>> 0) / 4294967296
  }
}

function protect(text: string): ReactNode[] {
  const random = seededRandom(text)
  const decoy = () => {
    const length = 2 + Math.floor(random() * 2)
    let out = ""
    for (let i = 0; i < length; i += 1) out += LETTERS[Math.floor(random() * LETTERS.length)]
    return out
  }
  // Split into words and the whitespace between them; whitespace stays as is.
  return text.split(/(\s+)/).map((part, index) => {
    if (part.length < MIN_WORD || /\s/.test(part)) return part
    const middle = Math.floor(part.length / 2)
    return (
      <Fragment key={index}>
        {part.slice(0, middle)}
        <span aria-hidden="true" style={DECOY_STYLE}>
          {decoy()}
        </span>
        {part.slice(middle)}
      </Fragment>
    )
  })
}

/**
 * Case text and questions for students: looks normal, but invisible decoy
 * letters sit inside each longer word, so text copied or read from the page
 * by an extension comes out scrambled ("reliaqxbility"). Screen readers skip
 * the decoys. Staff, and local testing with VITE_ALLOW_STUDENT_CLIPBOARD=true,
 * get the plain text.
 */
export default function ProtectedText({ text }: { text: string | null | undefined }) {
  const guarded = getUserRole() === "student" && !ALLOW_STUDENT_CLIPBOARD
  const value = text ?? ""
  const content = useMemo(() => (guarded ? protect(value) : value), [guarded, value])
  return <>{content}</>
}
