"""Scope subjects to a semester (course + semester).

Revision ID: 0018
Revises: 0017
Create Date: 2026-08-06
"""

from alembic import op

revision = "0018"
down_revision = "0017"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        ALTER TABLE subjects
            ADD COLUMN IF NOT EXISTS semester_id INT REFERENCES semesters(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_subjects_semester_id ON subjects(semester_id);
        """
    )


def downgrade():
    op.execute(
        """
        ALTER TABLE subjects DROP COLUMN IF EXISTS semester_id;
        """
    )
