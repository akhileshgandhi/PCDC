"""Remove Constraints, Reflection Questions, and Learning Outcomes as
standalone case sections (folded into Description, per the same pattern as
0027), and drop the three faculty-only notes fields (Common Mistakes,
Discussion Points, Key Learning Points) entirely — they're internal faculty
notes, not narrative content, so they are not folded into the student-facing
Description.

Revision ID: 0028
Revises: 0027
Create Date: 2026-08-26
"""

import json

from alembic import op

revision = "0028"
down_revision = "0027"
branch_labels = None
depends_on = None

REMAINING_SECTIONS = ["data", "objectives"]
FOLDED_SECTION_KEYS = ["constraints", "reflection_questions", "learning_outcomes"]


def _section_to_text(value):
    if isinstance(value, list):
        return "\n".join(str(item).strip() for item in value if str(item).strip())
    return str(value or "").strip()


def _fold_description(existing_description, sections):
    parts = [existing_description or ""]
    for key in FOLDED_SECTION_KEYS:
        text_value = _section_to_text(sections.get(key))
        if text_value:
            parts.append(text_value)
    return "\n\n".join(p.strip() for p in parts if p and p.strip())


def upgrade():
    conn = op.get_bind()

    # ---- case_studies: fold constraints/reflection_questions/learning_outcomes into description ----
    rows = conn.exec_driver_sql(
        "SELECT id, description, content FROM case_studies"
    ).fetchall()
    for row in rows:
        case_id, description, content = row
        try:
            parsed = json.loads(content or "{}")
        except (TypeError, ValueError):
            parsed = {}
        sections = parsed.get("sections") or {}
        section_meta = parsed.get("section_meta") or {}

        new_description = _fold_description(description, sections)
        new_sections = {key: sections.get(key, "") for key in REMAINING_SECTIONS}
        new_section_meta = {key: section_meta.get(key, "manual") for key in REMAINING_SECTIONS}
        new_content = json.dumps({
            "expected_outcomes": parsed.get("expected_outcomes", ""),
            "sections": new_sections,
            "section_meta": new_section_meta,
        })

        conn.exec_driver_sql(
            "UPDATE case_studies SET description = %s, content = %s, updated_at = NOW() "
            "WHERE id = %s",
            (new_description, new_content, case_id),
        )

    # ---- case_study_bank: same fold for snapshot.sections into snapshot.description ----
    bank_rows = conn.exec_driver_sql(
        "SELECT id, case_snapshot FROM case_study_bank"
    ).fetchall()
    for row in bank_rows:
        entry_id, snapshot_raw = row
        try:
            snapshot = json.loads(snapshot_raw or "{}")
        except (TypeError, ValueError):
            snapshot = {}
        sections = snapshot.get("sections") or {}
        instructions = snapshot.get("instructions") or {}

        snapshot["description"] = _fold_description(snapshot.get("description", ""), sections)
        if isinstance(snapshot.get("sections"), dict):
            for key in FOLDED_SECTION_KEYS:
                snapshot["sections"].pop(key, None)
        if isinstance(instructions, dict):
            for key in ["faculty_common_mistakes", "faculty_discussion_points", "key_learning_points"]:
                instructions.pop(key, None)

        conn.exec_driver_sql(
            "UPDATE case_study_bank SET case_snapshot = %s, updated_at = NOW() WHERE id = %s",
            (json.dumps(snapshot), entry_id),
        )

    # ---- drop now-unused columns ----
    op.execute("ALTER TABLE case_studies DROP COLUMN IF EXISTS reflection_questions")
    op.execute("ALTER TABLE case_studies DROP COLUMN IF EXISTS learning_outcomes")
    op.execute("ALTER TABLE case_studies DROP COLUMN IF EXISTS faculty_common_mistakes")
    op.execute("ALTER TABLE case_studies DROP COLUMN IF EXISTS faculty_discussion_points")
    op.execute("ALTER TABLE case_studies DROP COLUMN IF EXISTS key_learning_points")


def downgrade():
    op.execute("ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS reflection_questions TEXT")
    op.execute("ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS learning_outcomes TEXT")
    op.execute("ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS faculty_common_mistakes TEXT")
    op.execute("ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS faculty_discussion_points TEXT")
    op.execute("ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS key_learning_points TEXT")
    # The Constraints/Reflection Questions/Learning Outcomes fold into
    # Description is not losslessly reversible (the section boundary is
    # gone); this downgrade restores the dropped columns (empty) only.
