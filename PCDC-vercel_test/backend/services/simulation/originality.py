"""Copied-content detection for students' written answers.

Flags a written answer when MORE THAN 50% of it is copied from either the case
study text or another student's answer to the same question.

How: both texts are broken into overlapping 5-word sequences ("shingles").
    copied % = shingles of the answer that also appear in the source
               / all shingles of the answer
Matching runs of 5 words (not single words) means naturally shared vocabulary
("revenue", "market share") doesn't count — only genuinely lifted passages do.
It is deterministic, needs no AI call, and the % is easy to explain to faculty.

This is flag-only and read-only: it never changes marks and never touches the
student's attempt flow. It runs when faculty open an attempt report, so it also
covers attempts made before this existed and catches peers who copied later.
"""

import html
import re
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

from sqlalchemy import text
from sqlalchemy.orm import Session

COPY_THRESHOLD_PCT = 50.0
SHINGLE_SIZE = 5
# Too short to judge fairly: a 10-word answer that quotes one phrase from the
# case would read as "60% copied".
MIN_ANSWER_WORDS = 20

_TAG_RE = re.compile(r"<[^>]+>")
_WORD_RE = re.compile(r"[a-z0-9]+")


def _words(value: Optional[str]) -> List[str]:
    if not value:
        return []
    plain = html.unescape(_TAG_RE.sub(" ", value))
    return _WORD_RE.findall(plain.lower())


def _shingles(words: List[str]) -> Set[Tuple[str, ...]]:
    if len(words) < SHINGLE_SIZE:
        return set()
    return {tuple(words[i : i + SHINGLE_SIZE]) for i in range(len(words) - SHINGLE_SIZE + 1)}


def copied_pct(answer_shingles: Set[Tuple[str, ...]], source_shingles: Set[Tuple[str, ...]]) -> float:
    if not answer_shingles:
        return 0.0
    return round(100.0 * len(answer_shingles & source_shingles) / len(answer_shingles), 1)


def _case_source_shingles(parts: Iterable[Optional[str]]) -> Set[Tuple[str, ...]]:
    source: Set[Tuple[str, ...]] = set()
    for part in parts:
        source |= _shingles(_words(part))
    return source


def check_attempt_originality(db: Session, attempt_id: int) -> List[Dict[str, Any]]:
    """Per written question of this attempt: % copied from the case and from
    the closest-matching other student, and whether it crosses the 50% line."""
    case_row = db.execute(
        text("""
            SELECT a.case_study_id, a.student_id, c.content, c.description
            FROM case_study_attempts a
            JOIN case_studies c ON c.id = a.case_study_id
            WHERE a.id = :aid
        """),
        {"aid": attempt_id},
    ).fetchone()
    if not case_row:
        return []

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
        return []

    # The case text plus every question's wording (restating the question
    # back is copying from the case too).
    question_texts = [a.question_text for a in answers]
    case_source = _case_source_shingles([case_row.content, case_row.description, *question_texts])

    # Other students' answers to the same questions. A student's own earlier
    # attempts are excluded — reusing your own work isn't copying.
    peer_rows = db.execute(
        text("""
            SELECT r.question_id, r.attempt_id, r.response_text, u.name AS student_name
            FROM case_question_responses r
            JOIN case_study_attempts a ON a.id = r.attempt_id
            JOIN users u ON u.id = a.student_id
            WHERE r.question_id = ANY(CAST(:qids AS INTEGER[]))
              AND r.attempt_id <> :aid
              AND a.student_id <> :sid
        """),
        {"qids": [a.question_id for a in answers], "aid": attempt_id, "sid": case_row.student_id},
    ).fetchall()
    peers_by_question: Dict[int, List[Any]] = {}
    for peer in peer_rows:
        peers_by_question.setdefault(peer.question_id, []).append(peer)

    results: List[Dict[str, Any]] = []
    for answer in answers:
        words = _words(answer.response_text)
        item: Dict[str, Any] = {
            "question_number": answer.question_number,
            "word_count": len(words),
            "case_copied_pct": None,
            "peer_copied_pct": None,
            "peer_attempt_id": None,
            "peer_student_name": None,
            "flagged": False,
            "source": None,
            "checked": len(words) >= MIN_ANSWER_WORDS,
        }
        if not item["checked"]:
            results.append(item)
            continue

        answer_shingles = _shingles(words)
        item["case_copied_pct"] = copied_pct(answer_shingles, case_source)

        best_peer: Tuple[float, Any] = (0.0, None)
        for peer in peers_by_question.get(answer.question_id, []):
            pct = copied_pct(answer_shingles, _shingles(_words(peer.response_text)))
            if pct > best_peer[0]:
                best_peer = (pct, peer)
        if best_peer[1] is not None:
            item["peer_copied_pct"] = best_peer[0]
            item["peer_attempt_id"] = best_peer[1].attempt_id
            item["peer_student_name"] = best_peer[1].student_name

        case_pct = item["case_copied_pct"] or 0.0
        peer_pct = item["peer_copied_pct"] or 0.0
        if max(case_pct, peer_pct) > COPY_THRESHOLD_PCT:
            item["flagged"] = True
            item["source"] = "case" if case_pct >= peer_pct else "peer"
        results.append(item)
    return results
