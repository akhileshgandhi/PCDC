"""Memo tasks (handover 8.2, DD6). A memo is stored as editor JSON plus a
plain-text copy for scoring and the similarity check. Everything here is rebuilt
on the server, so a browser can't save anything the editor doesn't allow."""
from typing import Any, Dict, Iterator, List, Optional, Tuple

MAX_MEMO_CHARS = 60_000
MAX_DEPTH = 8
MAX_SECTIONS = 12
MAX_SECTION_CHARS = 120
MAX_NOTE_CHARS = 300
MAX_MIN_WORDS = 5000
MAX_CRITERIA = 12
HEADING_LEVELS = (2, 3)
MARKS = ("bold", "italic")

_BLOCKS = ("paragraph", "heading", "bulletList", "orderedList")
_CHILDREN = {
    "listItem": _BLOCKS,
    "bulletList": ("listItem",),
    "orderedList": ("listItem",),
    "paragraph": ("text",),
    "heading": ("text",),
}


def _clean_children(raw: Any, allowed: Tuple[str, ...], depth: int) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for node in raw if isinstance(raw, list) else []:
        kind = node.get("type") if isinstance(node, dict) else None
        if kind not in allowed:
            continue
        if kind == "text":
            value = node.get("text")
            if isinstance(value, str) and value:
                raw_marks = node.get("marks")
                marks = [
                    {"type": m["type"]}
                    for m in (raw_marks if isinstance(raw_marks, list) else [])
                    if isinstance(m, dict) and m.get("type") in MARKS
                ]
                out.append({"type": "text", "text": value, **({"marks": marks} if marks else {})})
            continue
        if depth >= MAX_DEPTH:
            continue
        clean: Dict[str, Any] = {"type": kind}
        if kind == "heading":
            attrs = node.get("attrs")
            level = attrs.get("level") if isinstance(attrs, dict) else None
            clean["attrs"] = {"level": level if level in HEADING_LEVELS else HEADING_LEVELS[0]}
        children = _clean_children(node.get("content"), _CHILDREN[kind], depth + 1)
        if children:
            clean["content"] = children
        elif kind in ("bulletList", "orderedList", "listItem"):
            continue
        out.append(clean)
    return out


def clean_doc(raw: Any) -> Dict[str, Any]:
    """Only headings, bold, italics and lists survive (DD6)."""
    content = _clean_children(raw.get("content"), _BLOCKS, 1) if isinstance(raw, dict) else []
    return {"type": "doc", "content": content or [{"type": "paragraph"}]}


def _text_blocks(node: Dict[str, Any]) -> Iterator[Tuple[str, str]]:
    """(block type, its text) for each paragraph and heading, in reading order."""
    if node["type"] in ("paragraph", "heading"):
        yield node["type"], "".join(child["text"] for child in node.get("content", []))
        return
    for child in node.get("content", []):
        yield from _text_blocks(child)


def plain_text(doc: Dict[str, Any]) -> str:
    return "\n".join(text for _, text in _text_blocks(doc) if text.strip())


def word_count(text: str) -> int:
    return len(text.split())


def memo_entry(raw_doc: Any) -> Dict[str, Any]:
    """What is stored per task. Raises ValueError if the memo is far too long."""
    doc = clean_doc(raw_doc)
    text = plain_text(doc)
    if len(text) > MAX_MEMO_CHARS:
        raise ValueError("This memo is too long to save.")
    return {"doc": doc, "text": text, "word_count": word_count(text)}


def _section_key(name: str) -> str:
    return " ".join(name.split()).casefold()


def structure_problems(entry: Dict[str, Any], config: Dict[str, Any]) -> List[str]:
    """Why this memo can't be submitted yet; empty when it can."""
    headings = {_section_key(text) for kind, text in _text_blocks(entry["doc"]) if kind == "heading"}
    problems = [
        f'Add the section heading "{name}".'
        for name in config.get("required_sections") or []
        if _section_key(name) not in headings
    ]
    words = entry["word_count"]
    min_words = int(config.get("min_words") or 0)
    if not words:
        problems.append("Write your memo before submitting.")
    elif words < min_words:
        problems.append(f"Write at least {min_words} words. You have {words}.")
    return problems


def _number(value: Any) -> Optional[float]:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number == number and abs(number) != float("inf") else None


def clean_memo_task(config: Any, rubric: Any) -> Tuple[Dict[str, Any], Dict[str, Any], List[str]]:
    """Faculty's memo settings: (config, rubric, problems)."""
    problems: List[str] = []
    config = config if isinstance(config, dict) else {}
    sections: List[str] = []
    seen = set()
    raw_sections = config.get("required_sections")
    for raw in raw_sections if isinstance(raw_sections, list) else []:
        name = " ".join(str(raw).split())
        if name and _section_key(name) not in seen:
            seen.add(_section_key(name))
            sections.append(name)
    if len(sections) > MAX_SECTIONS:
        problems.append(f"a memo can have at most {MAX_SECTIONS} required sections.")
    if any(len(name) > MAX_SECTION_CHARS for name in sections):
        problems.append(f"a section heading can have at most {MAX_SECTION_CHARS} characters.")
    min_words = _number(config.get("min_words") or 0)
    if min_words is None or min_words < 0 or min_words > MAX_MIN_WORDS:
        problems.append(f"minimum words must be between 0 and {MAX_MIN_WORDS}.")
        min_words = 0

    criteria: List[Dict[str, Any]] = []
    raw_criteria = rubric.get("criteria") if isinstance(rubric, dict) else None
    for raw in raw_criteria if isinstance(raw_criteria, list) else []:
        name = " ".join(str(raw.get("name") or "").split()) if isinstance(raw, dict) else ""
        if not name:
            continue
        marks = _number(raw.get("max"))
        if marks is None or marks <= 0:
            problems.append(f'rubric criterion "{name}" needs marks above 0.')
            continue
        criteria.append({"name": name, "max": marks})
    if len(criteria) > MAX_CRITERIA:
        problems.append(f"a rubric can have at most {MAX_CRITERIA} criteria.")
    clean_config: Dict[str, Any] = {"required_sections": sections, "min_words": int(min_words)}
    # Optional guidance per section, shown to the student beside the memo.
    raw_notes = config.get("section_notes")
    notes = {}
    for name in sections:
        note = raw_notes.get(name) if isinstance(raw_notes, dict) else None
        note = " ".join(str(note or "").split())
        if note:
            notes[name] = note[:MAX_NOTE_CHARS]
    if notes:
        clean_config["section_notes"] = notes
    return clean_config, {"criteria": criteria}, problems
