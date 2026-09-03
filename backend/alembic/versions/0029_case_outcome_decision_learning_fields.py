"""Add the three case-authoring fields required by the client's MBA case
specification: outcome_statement ("The Expected Outcome" — distinct from the
existing expected_outcomes/description narrative), decision_options
("Decision / Action Options", 3-4 items), and learning_takeaways ("Learning
Takeaway", 2-4 items). Stored as TEXT/JSON-array-as-text to match every other
array-ish column on this table (e.g. blooms_levels, recommended_semesters).

Also backfills existing rows' difficulty_label and blooms_levels to match the
renamed DIFFICULTY_LABELS and the new two-Bloom's-level-per-difficulty mapping
introduced alongside this migration (backend/services/faculty/router.py),
so previously-created cases display consistently with newly-created ones.

Revision ID: 0029
Revises: 0028
Create Date: 2026-09-02
"""

import json

from alembic import op

revision = "0029"
down_revision = "0028"
branch_labels = None
depends_on = None

DIFFICULTY_LABELS = ["Observation", "Analysis", "Decision Making", "Leadership", "Strategic Thinking"]
BLOOMS_BY_DIFFICULTY = {
    1: ["Remember", "Understand"],
    2: ["Understand", "Apply"],
    3: ["Apply", "Analyze"],
    4: ["Analyze", "Evaluate"],
    5: ["Evaluate", "Create"],
}


def upgrade():
    op.execute("ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS outcome_statement TEXT")
    op.execute("ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS decision_options TEXT")
    op.execute("ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS learning_takeaways TEXT")

    conn = op.get_bind()
    for level, label in enumerate(DIFFICULTY_LABELS, start=1):
        conn.exec_driver_sql(
            "UPDATE case_studies SET difficulty_label = %s WHERE difficulty = %s",
            (label, level),
        )
    for level, blooms in BLOOMS_BY_DIFFICULTY.items():
        conn.exec_driver_sql(
            "UPDATE case_studies SET blooms_levels = %s WHERE difficulty = %s",
            (json.dumps(blooms), level),
        )


def downgrade():
    op.execute("ALTER TABLE case_studies DROP COLUMN IF EXISTS outcome_statement")
    op.execute("ALTER TABLE case_studies DROP COLUMN IF EXISTS decision_options")
    op.execute("ALTER TABLE case_studies DROP COLUMN IF EXISTS learning_takeaways")
    # difficulty_label/blooms_levels backfill is not reversed — the prior
    # labels/values are not recoverable from state alone.
