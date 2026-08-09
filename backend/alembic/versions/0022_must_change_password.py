"""Add users.must_change_password to force a password reset on first login.

Revision ID: 0022
Revises: 0021
Create Date: 2026-08-09
"""

from alembic import op

revision = "0022"
down_revision = "0021"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
        """
    )


def downgrade():
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS must_change_password;")
