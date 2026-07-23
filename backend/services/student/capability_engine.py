"""Dashboard-facing capability aggregation (SPEC_17).

Score *updates* already happen in services.simulation.service
(update_capability_scores / update_single_capability_score), which is wired
into the case-study attempt completion flow and already implements the
rolling-weighted-average algorithm with attempt_count tracking and level
progression. This module does not duplicate that write path — it only reads
student_capabilities to build the 4-category dashboard view and derive the
hero message / level label.

CATEGORY_MAP maps the dashboard's 4 display categories onto the real
case_study capabilities that exist in the `capabilities` table today (8
flat names, no category column) rather than the 20-name taxonomy an earlier
draft of this feature assumed — see context/current-feature.md history for
why.
"""

from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

CATEGORY_MAP: Dict[str, List[str]] = {
    "cognitive": ["Decision Making", "Strategic Thinking"],
    "leadership": ["Communication", "Leadership"],
    "entrepreneurial": ["Innovation", "Entrepreneurship"],
    "professional": ["Problem Solving", "Professionalism"],
}

CATEGORY_LABELS: Dict[str, str] = {
    "cognitive": "Cognitive Capabilities",
    "leadership": "Leadership Capabilities",
    "entrepreneurial": "Entrepreneurial Capabilities",
    "professional": "Professional Capabilities",
}

HERO_MESSAGES: Dict[str, str] = {
    "cognitive": "Your next challenge is designed to sharpen analytical thinking and decision quality.",
    "leadership": "Your next challenge is designed to strengthen leadership presence and communication.",
    "entrepreneurial": "Your next challenge is designed to build risk awareness and entrepreneurial thinking.",
    "professional": "Your next challenge is designed to develop professional judgment and execution skills.",
    "no_attempts": (
        "Your next challenge is designed to strengthen strategic judgment and "
        "risk awareness. Keep sharpening."
    ),
}

# The live engine (services.simulation.service.update_student_level) already
# maintains students.current_level on a 7-level scale (thresholds 60/70/80/
# 85/90/95), which the Mentor portal already displays. Rather than adopt the
# spec's separate 5-level scale (which would require re-deriving every
# existing student's level and touching the Mentor portal), this label map
# extends that existing scale with labels instead of replacing it.
LEVEL_LABELS: Dict[int, str] = {
    1: "Foundation",
    2: "Developing",
    3: "Regular",
    4: "Proficient",
    5: "Advanced",
    6: "Expert",
    7: "Champion",
}


def get_capability_matrix(db: Session, student_id: int) -> Dict[str, Any]:
    rows = db.execute(
        text("""
            SELECT c.name, sc.current_score, sc.attempt_count
            FROM capabilities c
            LEFT JOIN student_capabilities sc
                ON sc.capability_id = c.id AND sc.student_id = :student_id
            WHERE c.engagement_type = 'case_study'
        """),
        {"student_id": student_id},
    ).fetchall()
    by_name = {row.name: row for row in rows}

    categories = []
    all_scores: List[float] = []
    total_attempts = 0
    for category_id, capability_names in CATEGORY_MAP.items():
        items = []
        category_scores: List[float] = []
        for name in capability_names:
            row = by_name.get(name)
            score = int(row.current_score) if row and row.current_score is not None else 0
            attempts = int(row.attempt_count) if row and row.attempt_count is not None else 0
            items.append({"name": name, "score": score, "attempts": attempts})
            category_scores.append(score)
            all_scores.append(score)
            total_attempts += attempts
        category_score = (
            round(sum(category_scores) / len(category_scores), 1) if category_scores else 0
        )
        categories.append(
            {
                "id": category_id,
                "label": CATEGORY_LABELS[category_id],
                "score": category_score,
                "items": items,
            }
        )

    overall_score = round(sum(all_scores) / len(all_scores), 1) if all_scores else 0
    return {
        "categories": categories,
        "overall_score": overall_score,
        "total_attempts": total_attempts,
    }


def get_hero_message(categories: List[Dict[str, Any]], total_attempts: int) -> str:
    if total_attempts == 0 or not categories:
        return HERO_MESSAGES["no_attempts"]
    weakest = min(categories, key=lambda category: category["score"])
    return HERO_MESSAGES.get(weakest["id"], HERO_MESSAGES["no_attempts"])


def get_level_label(level: Optional[int]) -> Optional[str]:
    if level is None:
        return None
    return LEVEL_LABELS.get(level, "Foundation")
