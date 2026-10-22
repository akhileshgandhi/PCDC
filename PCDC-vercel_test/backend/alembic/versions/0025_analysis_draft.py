"""Persist an in-progress Initial Analysis draft so a page reload before
submission doesn't wipe typed answers. Reloading previously restarted the
attempt at the Reading screen with everything lost, since the analysis text
and per-question answers only ever reached the database on final submit.

Revision ID: 0025
Revises: 0024
Create Date: 2026-08-13
"""

from alembic import op

revision = "0025"
down_revision = "0024"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "ALTER TABLE case_study_attempts ADD COLUMN IF NOT EXISTS analysis_draft TEXT;"
    )


def downgrade():
    op.execute("ALTER TABLE case_study_attempts DROP COLUMN IF EXISTS analysis_draft;")
