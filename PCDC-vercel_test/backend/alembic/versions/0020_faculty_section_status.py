"""Add status to faculty_sections for self-selection + approval workflow.

Revision ID: 0020
Revises: 0019
Create Date: 2026-08-07
"""

from alembic import op

revision = "0020"
down_revision = "0019"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        ALTER TABLE faculty_sections
            ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
        """
    )


def downgrade():
    op.execute(
        """
        ALTER TABLE faculty_sections DROP COLUMN IF EXISTS status;
        """
    )
