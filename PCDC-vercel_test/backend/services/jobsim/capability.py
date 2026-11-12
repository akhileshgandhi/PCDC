"""Job simulation scores -> the student's capability profile.

When an attempt is finished and every memo and deck has its score, the
weighted total (the simulation's own weights, default 60% spreadsheet, 20%
memo, 20% presentation) goes into the existing capability update for each
capability tagged on the simulation, then the student's level is updated.

The case-study path (services.simulation.service.update_capability_scores)
reads case_study_tags, so it is not used or changed here. This only calls
the same per-capability and level helpers it uses.

Called from the three places a score can become final:
- the attempt is submitted (Finish or time-up) with nothing left to score,
- the AI saves the last memo or deck score,
- faculty mark a memo or deck that was waiting, or change any marks later.
An attempt adds to the profile once (jobsim_capability_updates). If its total
changes later (faculty change marks, a memo is re-scored), its earlier share
is replaced rather than counted again. Runs inside the caller's transaction,
under a savepoint: if it fails, the caller's work still saves.
"""

import json
import logging
from typing import Any, Dict, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from services.simulation.service import (
    get_recency_weight,
    get_student_profile,
    maybe_create_score_drop_alert,
    update_single_capability_score,
    update_student_level,
)

logger = logging.getLogger(__name__)

DEFAULT_WEIGHTS: Dict[str, float] = {"spreadsheet": 60, "memo": 20, "presentation": 20}
SECTIONS = ("spreadsheet", "memo", "presentation")


def _weights(raw: Any) -> Dict[str, float]:
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except json.JSONDecodeError:
            raw = None
    if not isinstance(raw, dict):
        return dict(DEFAULT_WEIGHTS)
    weights: Dict[str, float] = {}
    for section in SECTIONS:
        try:
            value = float(raw.get(section, DEFAULT_WEIGHTS[section]))
        except (TypeError, ValueError):
            value = DEFAULT_WEIGHTS[section]
        weights[section] = max(0.0, value)
    return weights if sum(weights.values()) > 0 else dict(DEFAULT_WEIGHTS)


def weighted_total(db: Session, attempt_id: int) -> Optional[Dict[str, Any]]:
    """The attempt's 0-100 weighted total and its parts, or None while the
    attempt is open or a memo or deck is still waiting for its score.

    Each section is marks earned / marks available for that task type. A
    section the simulation has no tasks for drops out and the other weights
    are scaled up, so a spreadsheet-only simulation is marked out of 100 too.
    """
    attempt = db.execute(
        text("""
            SELECT a.status, s.weights
            FROM jobsim_attempts a JOIN jobsim_simulations s ON s.id = a.simulation_id
            WHERE a.id = :aid
        """),
        {"aid": attempt_id},
    ).fetchone()
    if not attempt or attempt.status == "in_progress":
        return None
    rows = db.execute(
        text("""
            SELECT t.type,
                   SUM(t.max_score) AS available,
                   -- every saved score counts, as in jobsim_attempts.total_score
                   -- (faculty can give marks to an 'incorrect' answer)
                   SUM(CASE WHEN r.status <> 'scoring' THEN COALESCE(r.score, 0) ELSE 0 END) AS earned,
                   COUNT(*) FILTER (WHERE r.status = 'scoring') AS waiting
            FROM jobsim_tasks t
            JOIN jobsim_attempts a ON a.simulation_id = t.simulation_id
            LEFT JOIN jobsim_task_results r ON r.task_id = t.id AND r.attempt_id = a.id
            WHERE a.id = :aid
            GROUP BY t.type
        """),
        {"aid": attempt_id},
    ).fetchall()
    if any(int(row.waiting or 0) for row in rows):
        return None
    weights = _weights(attempt.weights)
    sections: Dict[str, float] = {}
    for row in rows:
        available = float(row.available or 0)
        if row.type in weights and available > 0:
            sections[row.type] = min(1.0, float(row.earned or 0) / available) * 100
    used = {section: weights[section] for section in sections if weights[section] > 0}
    if not used:
        return None
    total = sum(sections[s] * w for s, w in used.items()) / sum(used.values())
    return {
        "score": round(total, 2),
        "sections": {s: round(v, 2) for s, v in sections.items()},
        "weights": used,
    }


def apply_attempt_to_profile(db: Session, attempt_id: int) -> bool:
    """Feed a finished, fully scored attempt into the capability profile.
    The first time, the weighted total goes in as a new score. After that, if
    the total changes (faculty change marks, a memo is re-scored), the
    attempt's earlier share is replaced; it is never counted twice.
    Returns True if the profile changed now. Never raises."""
    try:
        with db.begin_nested():
            return _apply(db, attempt_id)
    except Exception:  # noqa: BLE001 - must not undo the score that triggered it
        logger.exception("Couldn't update the capability profile for jobsim attempt %s", attempt_id)
        return False


def _capability_row(db: Session, student_id: int, capability_id: int) -> Optional[Any]:
    return db.execute(
        text("""
            SELECT id, current_score, attempt_count FROM student_capabilities
            WHERE student_id = :student_id AND capability_id = :capability_id
        """),
        {"student_id": student_id, "capability_id": capability_id},
    ).fetchone()


def _apply(db: Session, attempt_id: int) -> bool:
    # Lock the attempt so two last scores saved together are applied in turn:
    # the second one sees the first as scored.
    attempt = db.execute(
        text("SELECT id, simulation_id, student_id FROM jobsim_attempts WHERE id = :aid FOR UPDATE"),
        {"aid": attempt_id},
    ).fetchone()
    if not attempt:
        return False
    total = weighted_total(db, attempt_id)
    if total is None:
        return False
    done = db.execute(
        text("SELECT student_id, weighted_score, breakdown FROM jobsim_capability_updates WHERE attempt_id = :aid"),
        {"aid": attempt_id},
    ).fetchone()
    if done:
        return _replace(db, attempt_id, done, total)
    profile = get_student_profile(db, attempt.student_id)  # jobsim student_id is users.id
    if not profile:
        return False
    capability_ids = [
        row.capability_id
        for row in db.execute(
            text("SELECT capability_id FROM jobsim_capability_tags WHERE simulation_id = :sid ORDER BY capability_id"),
            {"sid": attempt.simulation_id},
        ).fetchall()
    ]
    score = int(round(total["score"]))
    # What each capability looked like around this update, so a later change
    # of marks can replace this attempt's share exactly.
    contributions: Dict[str, Any] = {}
    for capability_id in capability_ids:
        before = _capability_row(db, profile.id, capability_id)
        first = not (before and before.attempt_count)
        update_single_capability_score(db, profile.id, capability_id, score)
        after = _capability_row(db, profile.id, capability_id)
        contributions[str(capability_id)] = {
            "first": first,
            "before": None if first else int(before.current_score or 0),
            "count_after": int(after.attempt_count) if after else 1,
        }
    if capability_ids:
        update_student_level(db, profile.id)
    db.execute(
        text("""
            INSERT INTO jobsim_capability_updates (attempt_id, simulation_id, student_id, weighted_score, breakdown)
            VALUES (:aid, :sid, :student, :score, CAST(:breakdown AS JSONB))
        """),
        {
            "aid": attempt_id,
            "sid": attempt.simulation_id,
            "student": profile.id,
            "score": total["score"],
            "breakdown": json.dumps({
                **total,
                "applied_score": score,
                "recency_weight": get_recency_weight(db),
                "capabilities": contributions,
                "changes": [],
            }),
        },
    )
    return True


def _replace(db: Session, attempt_id: int, done: Any, total: Dict[str, Any]) -> bool:
    """The attempt's total changed after it updated the profile: swap its old
    share of each capability score for the new one.

    Scores blend as new = old * (1 - w) + total * w (a first score is set
    directly). If nothing has updated the capability since, it is worked out
    again from the score before this attempt. If other attempts came after,
    this attempt's share has shrunk by (1 - w) for each, so the change is
    scaled down the same way.
    """
    breakdown = done.breakdown if isinstance(done.breakdown, dict) else json.loads(done.breakdown or "{}")
    old = breakdown.get("applied_score")
    old = int(round(float(done.weighted_score))) if old is None else int(old)
    new = int(round(total["score"]))
    record = {**breakdown, **total, "applied_score": new}
    if new == old:
        if float(done.weighted_score) != total["score"]:
            _save_record(db, attempt_id, total["score"], record)
        return False
    w = float(breakdown.get("recency_weight", get_recency_weight(db)))
    for key, share in (breakdown.get("capabilities") or {}).items():
        capability_id = int(key)
        row = _capability_row(db, done.student_id, capability_id)
        if not row:
            continue
        current = int(row.current_score or 0)
        later = max(0, int(row.attempt_count or 0) - int(share.get("count_after", 1)))
        if later == 0:
            target = new if share.get("first") else round(int(share.get("before") or 0) * (1 - w) + new * w)
        else:
            weight = (1 if share.get("first") else w) * (1 - w) ** later
            target = round(current + (new - old) * weight)
        target = max(0, min(100, int(target)))
        if target == current:
            continue
        db.execute(
            text("UPDATE student_capabilities SET current_score = :score, last_updated = NOW() WHERE id = :id"),
            {"score": target, "id": row.id},
        )
        maybe_create_score_drop_alert(db, done.student_id, capability_id, current, target)
    update_student_level(db, done.student_id)
    record["changes"] = [*(breakdown.get("changes") or []), {"from": old, "to": new}]
    _save_record(db, attempt_id, total["score"], record)
    return True


def _save_record(db: Session, attempt_id: int, score: float, record: Dict[str, Any]) -> None:
    db.execute(
        text("""
            UPDATE jobsim_capability_updates
            SET weighted_score = :score, breakdown = CAST(:breakdown AS JSONB), applied_at = NOW()
            WHERE attempt_id = :aid
        """),
        {"aid": attempt_id, "score": score, "breakdown": json.dumps(record)},
    )
