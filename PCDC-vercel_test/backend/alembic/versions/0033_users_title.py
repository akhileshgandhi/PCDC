"""Add an honorific title (Dr., Prof., Mr., Mrs., Ms.) to users, set by admins on
faculty profiles and shown in the faculty portal greeting.

Revision ID: 0033
Revises: 0032
Create Date: 2026-10-23
"""

from alembic import op

revision = "0033"
down_revision = "0032"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS title VARCHAR(20);")


def downgrade():
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS title;")
