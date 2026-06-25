"""Baseline existing schema.

Revision ID: 0001
Revises:
Create Date: 2026-06-25

The initial PCDC tables were created from database/schema.sql before
Alembic was added. This revision records that existing schema as the
Alembic baseline so later migrations can run in order.
"""

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
