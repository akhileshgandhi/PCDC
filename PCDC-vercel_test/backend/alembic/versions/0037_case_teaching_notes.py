"""Teaching Notes on each case study.

One free-text section for faculty and admins (handover item 12). It has its own
endpoints (services/faculty/teaching_notes.py) and is not in any student query.

Revision ID: 0037
Revises: 0036
Create Date: 2026-11-04
"""

from alembic import op

revision = "0037"
down_revision = "0036"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS teaching_notes TEXT")


def downgrade():
    op.execute("ALTER TABLE case_studies DROP COLUMN IF EXISTS teaching_notes")
