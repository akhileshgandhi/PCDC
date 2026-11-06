"""Per-student datasets for job simulations (handover DD2).

A seeded attempt rebuilds its data from the simulation's column spec and the
attempt seed. Attempts started before this, and simulations with uploaded data
(no spec), keep using the simulation's stored dataset, so the flag defaults to
FALSE and existing answer keys stay valid.

Revision ID: 0038
Revises: 0037
Create Date: 2026-11-04
"""

from alembic import op

revision = "0038"
down_revision = "0037"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "ALTER TABLE jobsim_attempts ADD COLUMN IF NOT EXISTS seeded_dataset BOOLEAN NOT NULL DEFAULT FALSE"
    )


def downgrade():
    op.execute("ALTER TABLE jobsim_attempts DROP COLUMN IF EXISTS seeded_dataset")
