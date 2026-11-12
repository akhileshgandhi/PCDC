"""Slide deck tasks (handover 8.3). A deck is stored as JSON [{title, points}]
plus a plain-text copy for scoring. Everything is rebuilt on the server, so a
browser can't save anything the slide editor doesn't allow.

Faculty can give a slide plan: the titles the deck should have, each with a
short note on what goes on that slide. The student's deck starts from that
plan. Only the slide count and "every slide has a title and a point" are
required (8.3); the plan guides, it doesn't block a submit.
"""
from typing import Any, Dict, List, Tuple

from .memo import _number

MAX_SLIDES = 15
MAX_POINTS = 8
MAX_TITLE_CHARS = 120
MAX_POINT_CHARS = 300
MAX_GUIDE_CHARS = 300
MAX_CRITERIA = 12


def _line(value: Any, limit: int) -> str:
    return " ".join(str(value or "").split())[:limit]


def clean_deck(raw: Any) -> List[Dict[str, Any]]:
    """Up to 15 slides, each a title and up to 8 one-line points."""
    slides: List[Dict[str, Any]] = []
    for item in raw if isinstance(raw, list) else []:
        if not isinstance(item, dict):
            continue
        raw_points = item.get("points")
        points = [_line(p, MAX_POINT_CHARS) for p in (raw_points if isinstance(raw_points, list) else [])]
        slides.append({"title": _line(item.get("title"), MAX_TITLE_CHARS), "points": points[:MAX_POINTS]})
        if len(slides) >= MAX_SLIDES:
            break
    return slides


def plain_text(slides: List[Dict[str, Any]]) -> str:
    lines: List[str] = []
    for number, slide in enumerate(slides, start=1):
        lines.append(f"Slide {number}: {slide['title']}")
        lines.extend(f"- {point}" for point in slide["points"] if point)
    return "\n".join(lines)


def deck_entry(raw_slides: Any) -> Dict[str, Any]:
    """What is stored per task."""
    slides = clean_deck(raw_slides)
    text = plain_text(slides) if any(s["title"] or any(s["points"]) for s in slides) else ""
    return {"slides": slides, "text": text, "word_count": len(text.split())}


def structure_problems(entry: Dict[str, Any], config: Dict[str, Any]) -> List[str]:
    """Why this deck can't be submitted yet; empty when it can."""
    slides = entry["slides"]
    problems: List[str] = []
    min_slides = int(config.get("min_slides") or 1)
    if len(slides) < min_slides:
        problems.append(f"Make at least {min_slides} slides. You have {len(slides)}.")
    for number, slide in enumerate(slides, start=1):
        if not slide["title"]:
            problems.append(f"Give slide {number} a title.")
        if not any(slide["points"]):
            problems.append(f"Add at least one point to slide {number}.")
    return problems


def clean_presentation_task(config: Any, rubric: Any) -> Tuple[Dict[str, Any], Dict[str, Any], List[str]]:
    """Faculty's deck settings: (config, rubric, problems)."""
    problems: List[str] = []
    config = config if isinstance(config, dict) else {}
    plan: List[Dict[str, str]] = []
    raw_plan = config.get("slide_plan")
    for raw in raw_plan if isinstance(raw_plan, list) else []:
        if not isinstance(raw, dict):
            continue
        title = _line(raw.get("title"), MAX_TITLE_CHARS + 1)
        if not title:
            continue
        plan.append({"title": title, "guide": _line(raw.get("guide"), MAX_GUIDE_CHARS + 1)})
    if len(plan) > MAX_SLIDES:
        problems.append(f"a slide plan can have at most {MAX_SLIDES} slides.")
    if any(len(p["title"]) > MAX_TITLE_CHARS for p in plan):
        problems.append(f"a slide title can have at most {MAX_TITLE_CHARS} characters.")
    if any(len(p["guide"]) > MAX_GUIDE_CHARS for p in plan):
        problems.append(f"a slide note can have at most {MAX_GUIDE_CHARS} characters.")
    min_slides = _number(config.get("min_slides") or len(plan) or 1)
    if min_slides is None or not 1 <= min_slides <= MAX_SLIDES:
        problems.append(f"minimum slides must be between 1 and {MAX_SLIDES}.")
        min_slides = 1

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
    return {"min_slides": int(min_slides), "slide_plan": plan[:MAX_SLIDES]}, {"criteria": criteria}, problems
