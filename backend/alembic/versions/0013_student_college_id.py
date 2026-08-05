"""Add college_id column to users table for students.

Revision ID: 0013
Revises: 0012
Create Date: 2026-07-30
"""

from alembic import op

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS college_id VARCHAR(50);
        """
    )


def downgrade():
    op.execute(
        """
        ALTER TABLE users
            DROP COLUMN IF EXISTS college_id;
        """
    )
