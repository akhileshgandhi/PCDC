"""Red-dot badge for students: unseen case study / simulation assignments.

seen_at on notification_log is set when the student opens the My Case Studies
/ My Simulations list, which clears the red badge in the student sidebar
(notification_log is already per-recipient, so this works even when the
underlying assignment was made to a whole section rather than one student;
same recipe as jobsim_simulations.sent_back_seen_at in 0040).

Revision ID: 0041
Revises: 0040
Create Date: 2026-11-12
"""

from alembic import op

revision = "0041"
down_revision = "0040"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS seen_at TIMESTAMP;")


def downgrade():
    op.execute("ALTER TABLE notification_log DROP COLUMN IF EXISTS seen_at;")
