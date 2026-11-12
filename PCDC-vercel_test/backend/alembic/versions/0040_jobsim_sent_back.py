"""Tell faculty when an admin sends their simulation back.

sent_back_at / sent_back_note are set when an admin sends an approved
simulation back to draft, and cleared when the author approves it again.
sent_back_seen_at is set when the author opens it, which clears the red
badge in the faculty sidebar.

Revision ID: 0040
Revises: 0039
Create Date: 2026-11-12
"""

from alembic import op

revision = "0040"
down_revision = "0039"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        ALTER TABLE jobsim_simulations
            ADD COLUMN IF NOT EXISTS sent_back_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS sent_back_note TEXT,
            ADD COLUMN IF NOT EXISTS sent_back_seen_at TIMESTAMP;
        """
    )


def downgrade():
    op.execute(
        """
        ALTER TABLE jobsim_simulations
            DROP COLUMN IF EXISTS sent_back_seen_at,
            DROP COLUMN IF EXISTS sent_back_note,
            DROP COLUMN IF EXISTS sent_back_at;
        """
    )
