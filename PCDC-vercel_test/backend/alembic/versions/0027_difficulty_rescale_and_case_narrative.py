"""Rescale difficulty 1-7 to 1-5, derive case-level Bloom's from difficulty,
and fold the legacy Situation/Background/Characters/Timeline sections plus
Company/Industry Background into the single Description narrative.

Rescale is proportional (CEIL(old * 5/7)) rather than clamped, so existing
levels spread across the new 1-5 range instead of collapsing 5/6/7 into "5":
  old 1 -> 1, old 2 -> 2, old 3 -> 3, old 4 -> 3, old 5 -> 4, old 6 -> 5, old 7 -> 5

Bloom's mapping (derived, not independently stored per question anymore):
  1: Remember/Understand, 2: Apply, 3: Analyze, 4: Evaluate, 5: Create

Revision ID: 0027
Revises: 0026
Create Date: 2026-08-26
"""

import json
import math

from alembic import op

revision = "0027"
down_revision = "0026"
branch_labels = None
depends_on = None

BLOOMS_BY_DIFFICULTY = {
    1: ["Remember", "Understand"],
    2: ["Apply"],
    3: ["Analyze"],
    4: ["Evaluate"],
    5: ["Create"],
}

REMAINING_SECTIONS = ["data", "constraints", "objectives", "reflection_questions", "learning_outcomes"]
FOLDED_SECTION_KEYS = ["situation", "background", "characters", "timeline"]


def _rescale(old_difficulty):
    if old_difficulty is None:
        return 3
    return max(1, min(5, math.ceil(old_difficulty * 5.0 / 7.0)))


def _fold_description(existing_description, sections, company_background=None, industry_background=None):
    parts = [existing_description or ""]
    for key in ["situation", "background"]:
        value = sections.get(key)
        if value:
            parts.append(str(value))
    if company_background:
        parts.append(str(company_background))
    if industry_background:
        parts.append(str(industry_background))
    for key in ["characters", "timeline"]:
        value = sections.get(key)
        if value:
            parts.append(str(value))
    return "\n\n".join(p.strip() for p in parts if p and p.strip())


def upgrade():
    conn = op.get_bind()

    # ---- case_studies: rescale + fold sections/instructions into description ----
    rows = conn.exec_driver_sql(
        "SELECT id, description, content, difficulty, company_background, industry_background "
        "FROM case_studies"
    ).fetchall()
    for row in rows:
        case_id, description, content, difficulty, company_bg, industry_bg = row
        try:
            parsed = json.loads(content or "{}")
        except (TypeError, ValueError):
            parsed = {}
        sections = parsed.get("sections") or {}
        section_meta = parsed.get("section_meta") or {}

        new_description = _fold_description(description, sections, company_bg, industry_bg)
        new_sections = {key: sections.get(key, [] if key in ("reflection_questions", "learning_outcomes") else "") for key in REMAINING_SECTIONS}
        new_section_meta = {key: section_meta.get(key, "manual") for key in REMAINING_SECTIONS}
        new_content = json.dumps({
            "expected_outcomes": parsed.get("expected_outcomes", ""),
            "sections": new_sections,
            "section_meta": new_section_meta,
        })

        new_difficulty = _rescale(difficulty)
        blooms_json = json.dumps(BLOOMS_BY_DIFFICULTY.get(new_difficulty, []))

        conn.exec_driver_sql(
            "UPDATE case_studies SET description = %s, content = %s, difficulty = %s, "
            "blooms_levels = %s, updated_at = NOW() WHERE id = %s",
            (new_description, new_content, new_difficulty, blooms_json, case_id),
        )

    # ---- case_study_bank: rescale difficulty + fold snapshot sections into snapshot.description ----
    bank_rows = conn.exec_driver_sql(
        "SELECT id, difficulty, case_snapshot FROM case_study_bank"
    ).fetchall()
    for row in bank_rows:
        entry_id, difficulty, snapshot_raw = row
        try:
            snapshot = json.loads(snapshot_raw or "{}")
        except (TypeError, ValueError):
            snapshot = {}
        sections = snapshot.get("sections") or {}
        instructions = snapshot.get("instructions") or {}
        folded = _fold_description(
            snapshot.get("description", ""),
            sections,
            instructions.get("company_background"),
            instructions.get("industry_background"),
        )
        snapshot["description"] = folded
        if isinstance(snapshot.get("sections"), dict):
            for key in FOLDED_SECTION_KEYS:
                snapshot["sections"].pop(key, None)
        if isinstance(snapshot.get("instructions"), dict):
            snapshot["instructions"].pop("company_background", None)
            snapshot["instructions"].pop("industry_background", None)

        new_difficulty = _rescale(difficulty)
        conn.exec_driver_sql(
            "UPDATE case_study_bank SET difficulty = %s, case_snapshot = %s, updated_at = NOW() WHERE id = %s",
            (new_difficulty, json.dumps(snapshot), entry_id),
        )

    # ---- drop now-unused columns (their content has been folded into description) ----
    op.execute("ALTER TABLE case_studies DROP COLUMN IF EXISTS company_background")
    op.execute("ALTER TABLE case_studies DROP COLUMN IF EXISTS industry_background")


def downgrade():
    op.execute("ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS company_background TEXT")
    op.execute("ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS industry_background TEXT")
    # Difficulty rescale and section-folding are not losslessly reversible
    # (the original 1-7 spread and the section/description boundary are gone);
    # this downgrade restores the dropped columns (empty) only.
