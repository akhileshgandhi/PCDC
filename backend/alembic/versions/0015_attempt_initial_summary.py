"""Add initial_summary (ungraded pre-analysis) to case_study_attempts.

Revision ID: 0015
Revises: 0014
Create Date: 2026-08-05
"""

from alembic import op

revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        ALTER TABLE case_study_attempts
            ADD COLUMN IF NOT EXISTS initial_summary TEXT;
        """
    )


def downgrade():
    op.execute(
        """
        ALTER TABLE case_study_attempts
            DROP COLUMN IF EXISTS initial_summary;
        """
    )
