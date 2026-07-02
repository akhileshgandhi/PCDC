"""Add missing due_date column to assigned_cases.

Revision ID: 0009
Revises: 0008
Create Date: 2026-07-02
"""

from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        ALTER TABLE assigned_cases
            ADD COLUMN IF NOT EXISTS due_date TIMESTAMP;
        """
    )


def downgrade():
    op.execute(
        """
        ALTER TABLE assigned_cases
            DROP COLUMN IF EXISTS due_date;
        """
    )
