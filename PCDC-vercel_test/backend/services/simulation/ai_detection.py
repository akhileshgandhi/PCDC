"""AI-written-content check for students' written answers (faculty only).

Estimates, per written answer, how likely it is (0-100%) that the text was
produced by an AI tool such as ChatGPT rather than written by the student, and
flags answers above 50%.

How the % is built from two independent signals:
1. Style signals (deterministic, explainable): characters that a keyboard
   doesn't type but ChatGPT/Word output contains (curly quotes ’ “, en/em
   dashes – —, bullets •), ChatGPT's typical layout (label lines such as
   "Recommendation:" / "Mitigation:", bullet and numbered lists), and stock AI
   phrasing. Informal/first-person writing and typos lower it.
2. An LLM review of all of the attempt's answers in one call, given the style
   signals as evidence.
   AI likelihood = the higher of the LLM's estimate and the style score's
   evidence-weighted blend (see _combine).

Results are stored in answer_ai_checks with the detector version, so the AI
runs once per answer; results from an older detector version are re-checked.

This is an estimate, not proof — no tool can prove text was AI-written. It is
flag-only: it never changes marks, never touches the student's attempt flow,
and is never shown to students. It runs when faculty open an attempt report,
so it also covers attempts made before it existed.
"""

import html
import re
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import text
from sqlalchemy.orm import Session

from shared.llm import (
    create_with_retry,
    get_llm_client,
    get_llm_model,
    json_response_format,
    parse_json_content,
)

AI_THRESHOLD_PCT = 50.0
# Short answers don't carry enough style signal for a fair estimate.
MIN_ANSWER_WORDS = 40
# Bump whenever the scoring changes so stored results are re-checked.
DETECTOR_VERSION = "v2"

_TAG_RE = re.compile(r"<[^>]+>")
_BLOCK_TAG_RE = re.compile(r"<\s*(br|/p|/li|/div|/h\d)\b[^>]*>", re.IGNORECASE)

# Typography a student's keyboard doesn't produce but ChatGPT / Word output does.
_PASTE_CHARS = {
    "‘": "‘", "’": "’", "“": "“", "”": "”",
    "–": "–", "—": "—", "…": "…", "•": "•", " ": "non-breaking space",
}
_LIST_LINE_RE = re.compile(r"^\s*(?:[-*•▪◦]|\d{1,2}[.)])\s+\S")
_LABEL_LINE_RE = re.compile(r"^\s*(?:\d{1,2}[.)]\s*)?[A-Z][A-Za-z0-9 ,&/()'’–-]{1,60}:\s*(\S|$)")
# "…adoption.1. Implementation…" — a numbered list that lost its line breaks.
_INLINE_NUMBERED_RE = re.compile(r"[.:]\s?\d{1,2}\.\s+[A-Z]")
_AI_PHRASES = [
    "delve", "multifaceted", "seamless", "holistic", "robust", "leverage", "foster",
    "pivotal", "landscape", "ever-evolving", "fast-paced", "it is crucial", "it is essential",
    "it is important to", "furthermore", "moreover", "additionally", "in conclusion",
    "overall,", "ensure that", "ensures that", "plays a crucial role", "a balanced approach",
    "best balance", "phased rollout", "phased approach", "measurable", "actionable",
    "data-driven", "key performance indicator", "subject to", "strike a balance",
    "long-term success", "sustainable growth", "this approach", "this initiative",
]
_INFORMAL_RE = re.compile(
    r"\b(i think|i feel|i guess|honestly|dont|cant|wont|didnt|isnt|gonna|wanna|kinda|u|ur|lol|ok so)\b"
)

AI_CHECK_SYSTEM_PROMPT = """You are an academic-integrity reviewer for a business school.
Students answer case-study questions by typing into a plain text box under time pressure.
For each answer, estimate the probability (0-100) that it was produced by an AI tool
(ChatGPT, Gemini, Copilot) and pasted or retyped, instead of being written by the student.

IMPORTANT: students can give the AI tool the full case, so case facts, figures, names
and numbers in an answer are NOT evidence of human writing. Judge HOW it is written.

Signals of AI-generated text (each one raises the probability):
- report-like layout: label lines such as "Recommendation:", "Mitigation:", "Alternative 1:",
  section headings, bullet points, numbered lists, phased plans ("Days 1–30"), KPI lists
- polished, formal, error-free prose with uniform sentence length and no personal voice
- systematically weighing every option, then a tidy recommendation and a monitoring plan
- hedged qualifiers ("subject to actual costs", "could potentially"), stock phrasing
  ("best balance", "phased rollout", "measurable improvements", "ensure", "leverage")
- typographic characters a keyboard doesn't type: curly quotes ’ “, en/em dashes – —, bullets •

Signals of a student writing (each one lowers the probability):
- spelling or grammar mistakes, missing capitals, informal or first-person wording ("I think")
- uneven, conversational reasoning, abbreviations, incomplete sentences

Calibration: a polished, well-structured, error-free answer with several AI signals and no
human signals should be 70-95. Plain conversational text with mistakes should be 5-30.
You are also given automatically detected style signals for each answer — weigh them.

Return JSON exactly in this shape:
{"results": [{"question_number": <int>, "ai_likelihood": <int 0-100>, "reason": "<one short sentence>"}]}
Include one entry for every answer you are given."""


def _ai_check_schema() -> Dict[str, Any]:
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "results": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "question_number": {"type": "integer"},
                        "ai_likelihood": {"type": "integer"},
                        "reason": {"type": "string"},
                    },
                    "required": ["question_number", "ai_likelihood", "reason"],
                },
            }
        },
        "required": ["results"],
    }


def _plain(value: Optional[str]) -> str:
    """Strip HTML but keep line breaks — layout is a key AI signal."""
    if not value:
        return ""
    with_breaks = _BLOCK_TAG_RE.sub("\n", value)
    plain = html.unescape(_TAG_RE.sub(" ", with_breaks)).replace("\r\n", "\n")
    lines = [" ".join(line.split()) for line in plain.split("\n")]
    return "\n".join(line for line in lines if line)


def style_signals(answer: str) -> Tuple[float, List[str]]:
    """Deterministic AI-style score (0-100) plus human-readable notes."""
    notes: List[str] = []
    score = 0.0
    lowered = answer.lower()
    words = max(len(answer.split()), 1)

    paste_found = [label for ch, label in _PASTE_CHARS.items() if ch in answer]
    if paste_found:
        score += 40 if len(paste_found) >= 2 else 30
        notes.append("non-keyboard characters " + " ".join(paste_found))

    lines = answer.split("\n")
    structure = sum(1 for line in lines if _LIST_LINE_RE.match(line) or _LABEL_LINE_RE.match(line))
    structure += len(_INLINE_NUMBERED_RE.findall(answer))
    if structure:
        score += 35 if structure >= 6 else 25 if structure >= 3 else 10
        notes.append(f"{structure} list/label line{'s' if structure != 1 else ''}")

    phrases = [p for p in _AI_PHRASES if p in lowered]
    if phrases:
        score += 20 if len(phrases) >= 3 else 10
        notes.append("AI-typical phrasing (" + ", ".join(phrases[:4]) + ")")

    informal = _INFORMAL_RE.findall(lowered)
    sentences = [s.strip() for s in re.split(r"[.!?]\s+", answer) if s.strip()]
    lowercase_starts = sum(1 for s in sentences if s[0].islower())
    if informal or (sentences and lowercase_starts / len(sentences) > 0.3):
        score -= 30
        notes.append("informal / first-person writing")

    # Very short answers can't carry many signals; keep the scale honest.
    if words < 80:
        score *= 0.8
    return max(0.0, min(100.0, round(score, 1))), notes


def _combine(llm_pct: Optional[float], style_pct: float) -> float:
    """Final likelihood. The LLM judges tone; the style score is hard evidence.
    Strong style evidence can't be overruled by a lenient LLM, and the LLM can
    still flag retyped AI text that carries no style artefacts."""
    if llm_pct is None:
        return style_pct
    if style_pct == 0:
        # No hard evidence at all: a strong, polished student shouldn't be
        # flagged on the LLM's tone judgement alone unless it is confident.
        return round(llm_pct * 0.85, 1)
    blended = 0.5 * llm_pct + 0.5 * style_pct
    return round(min(100.0, max(llm_pct, blended, style_pct * 0.9)), 1)


def _estimate_ai_likelihood(
    db: Session, answers: List[Any], signals: Dict[int, Tuple[float, List[str]]]
) -> Dict[int, Dict[str, Any]]:
    """One LLM call for all of an attempt's unchecked answers. Returns
    {question_number: {"ai_pct": float, "reason": str}}."""
    blocks = []
    for a in answers:
        style_pct, notes = signals[a.question_number]
        detected = "; ".join(notes) if notes else "none"
        blocks.append(
            f"Question {a.question_number}: {_plain(a.question_text)}\n"
            f"Detected style signals: {detected}\n"
            f"Student answer (original line breaks kept):\n{_plain(a.response_text)}"
        )
    client = get_llm_client()
    response = create_with_retry(
        client,
        {
            "model": get_llm_model(),
            "messages": [
                {"role": "system", "content": AI_CHECK_SYSTEM_PROMPT},
                {"role": "user", "content": "Review these answers and return JSON.\n\n" + "\n\n---\n\n".join(blocks)},
            ],
            "response_format": json_response_format(_ai_check_schema(), "answer_ai_check"),
            "temperature": 0,
            "timeout": 60,
        },
        db=db,
        fallback_schema=_ai_check_schema(),
        fallback_schema_name="answer_ai_check",
    )
    parsed = parse_json_content(response.choices[0].message.content)
    llm: Dict[int, Tuple[float, str]] = {}
    for item in parsed.get("results", []) if isinstance(parsed, dict) else []:
        try:
            number = int(item.get("question_number"))
            pct = float(item.get("ai_likelihood"))
        except (TypeError, ValueError):
            continue
        llm[number] = (min(max(pct, 0.0), 100.0), str(item.get("reason") or "").strip())

    results: Dict[int, Dict[str, Any]] = {}
    for a in answers:
        if a.question_number not in llm:
            continue
        llm_pct, llm_reason = llm[a.question_number]
        style_pct, notes = signals[a.question_number]
        reason = llm_reason
        if notes:
            reason = f"{llm_reason} Signals: {'; '.join(notes)}.".strip()
        results[a.question_number] = {"ai_pct": _combine(llm_pct, style_pct), "reason": reason[:500]}
    return results


def check_attempt_ai_content(db: Session, attempt_id: int) -> Dict[str, Any]:
    """Per written question of this attempt: AI-written likelihood, a short
    reason, and whether it crosses the 50% line.

    status is "ok", or "unavailable" when the AI service could not be reached
    (answers that were already checked are still returned)."""
    answers = db.execute(
        text("""
            SELECT r.question_id, cq.question_number, cq.question_text, r.response_text
            FROM case_question_responses r
            JOIN case_questions cq ON cq.id = r.question_id
            WHERE r.attempt_id = :aid
            ORDER BY cq.question_number
        """),
        {"aid": attempt_id},
    ).fetchall()
    if not answers:
        return {"status": "ok", "results": []}

    version_tag = f"|{DETECTOR_VERSION}"
    stored: Dict[int, Dict[str, Any]] = {
        row.question_id: {"ai_pct": float(row.ai_pct), "reason": row.reason}
        for row in db.execute(
            text("SELECT question_id, ai_pct, reason, model FROM answer_ai_checks WHERE attempt_id = :aid"),
            {"aid": attempt_id},
        ).fetchall()
        # Results from an older detector version are re-checked.
        if (row.model or "").endswith(version_tag)
    }

    word_counts = {a.question_id: len(_plain(a.response_text).split()) for a in answers}
    to_check = [
        a for a in answers if a.question_id not in stored and word_counts[a.question_id] >= MIN_ANSWER_WORDS
    ]

    status = "ok"
    if to_check:
        signals = {a.question_number: style_signals(_plain(a.response_text)) for a in to_check}
        try:
            estimates = _estimate_ai_likelihood(db, to_check, signals)
        except Exception:  # noqa: BLE001 - AI outage must not break the report
            db.rollback()
            estimates = {}
            status = "unavailable"
        model = f"{get_llm_model()}{version_tag}"
        for answer in to_check:
            estimate = estimates.get(answer.question_number)
            if estimate is None:
                continue
            db.execute(
                text("""
                    INSERT INTO answer_ai_checks (attempt_id, question_id, ai_pct, reason, model)
                    VALUES (:aid, :qid, :pct, :reason, :model)
                    ON CONFLICT (attempt_id, question_id) DO UPDATE
                    SET ai_pct = EXCLUDED.ai_pct, reason = EXCLUDED.reason,
                        model = EXCLUDED.model, checked_at = CURRENT_TIMESTAMP
                """),
                {"aid": attempt_id, "qid": answer.question_id, "pct": estimate["ai_pct"],
                 "reason": estimate["reason"], "model": model},
            )
            stored[answer.question_id] = estimate
        db.commit()
        if status == "ok" and any(a.question_id not in stored for a in to_check):
            status = "unavailable"

    results: List[Dict[str, Any]] = []
    for answer in answers:
        words = word_counts[answer.question_id]
        found = stored.get(answer.question_id)
        ai_pct = found["ai_pct"] if found else None
        results.append({
            "question_number": answer.question_number,
            "word_count": words,
            "checked": ai_pct is not None,
            "too_short": words < MIN_ANSWER_WORDS,
            "ai_pct": ai_pct,
            "reason": found["reason"] if found else None,
            "flagged": ai_pct is not None and ai_pct > AI_THRESHOLD_PCT,
        })
    return {"status": status, "results": results}
