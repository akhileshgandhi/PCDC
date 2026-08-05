"""Add google_sub to users for Google Sign-In account linking.

Revision ID: 0016
Revises: 0015
Create Date: 2026-08-05
"""

from alembic import op

revision = "0016"
down_revision = "0015"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255);
        """
    )


def downgrade():
    op.execute(
        """
        ALTER TABLE users
            DROP COLUMN IF EXISTS google_sub;
        """
    )
