"""Add mobile_number column to users table, populated via the student bulk
import template.

Revision ID: 0030
Revises: 0029
Create Date: 2026-09-18
"""

from alembic import op

revision = "0030"
down_revision = "0029"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(20);
        """
    )


def downgrade():
    op.execute(
        """
        ALTER TABLE users
            DROP COLUMN IF EXISTS mobile_number;
        """
    )
