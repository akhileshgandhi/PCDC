"""Add per-phase start timestamps to case_study_attempts for server-side timing.

Revision ID: 0014
Revises: 0013
Create Date: 2026-08-03
"""

from alembic import op

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        ALTER TABLE case_study_attempts
            ADD COLUMN IF NOT EXISTS reading_started_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS writing_started_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS rapid_fire_started_at TIMESTAMP;
        """
    )


def downgrade():
    op.execute(
        """
        ALTER TABLE case_study_attempts
            DROP COLUMN IF EXISTS reading_started_at,
            DROP COLUMN IF EXISTS writing_started_at,
            DROP COLUMN IF EXISTS rapid_fire_started_at;
        """
    )
