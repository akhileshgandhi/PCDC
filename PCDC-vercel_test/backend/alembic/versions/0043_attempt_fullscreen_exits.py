"""Full-screen exit tracking on student attempts.

Students must stay in full screen during a case study or job simulation
attempt. fullscreen_exits counts how many times they left (the attempt ends
on the third); fullscreen_active is whether the attempt is in full screen now,
so leaving by reloading or closing the page still counts. See
shared/fullscreen.py.

Revision ID: 0043
Revises: 0042
Create Date: 2026-11-18
"""

from alembic import op

revision = "0043"
down_revision = "0042"
branch_labels = None
depends_on = None

TABLES = ("case_study_attempts", "jobsim_attempts")


def upgrade():
    for table in TABLES:
        op.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS fullscreen_exits INTEGER NOT NULL DEFAULT 0;")
        op.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS fullscreen_active BOOLEAN NOT NULL DEFAULT FALSE;")


def downgrade():
    for table in TABLES:
        op.execute(f"ALTER TABLE {table} DROP COLUMN IF EXISTS fullscreen_active;")
        op.execute(f"ALTER TABLE {table} DROP COLUMN IF EXISTS fullscreen_exits;")
