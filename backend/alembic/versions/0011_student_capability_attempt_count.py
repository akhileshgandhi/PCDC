"""Add attempt_count to student_capabilities so the dashboard Capability
Matrix can show a per-sub-capability "Based on N case attempts" tooltip
(SPEC_17).

Revision ID: 0011
Revises: 0010
Create Date: 2026-07-23
"""

from alembic import op

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        ALTER TABLE student_capabilities
            ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;
        """
    )


def downgrade():
    op.execute(
        """
        ALTER TABLE student_capabilities
            DROP COLUMN IF EXISTS attempt_count;
        """
    )
