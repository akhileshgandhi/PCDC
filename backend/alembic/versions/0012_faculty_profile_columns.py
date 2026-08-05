"""Add faculty profile columns to users table.

Revision ID: 0012
Revises: 0011
Create Date: 2026-07-30
"""

from alembic import op

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS department VARCHAR(100),
            ADD COLUMN IF NOT EXISTS designation VARCHAR(100),
            ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50),
            ADD COLUMN IF NOT EXISTS experience_years INT;
        """
    )


def downgrade():
    op.execute(
        """
        ALTER TABLE users
            DROP COLUMN IF EXISTS department,
            DROP COLUMN IF EXISTS designation,
            DROP COLUMN IF EXISTS employee_id,
            DROP COLUMN IF EXISTS experience_years;
        """
    )
