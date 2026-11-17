"""Per-student instructions on a case assignment.

assigned_cases already has due_date, but the "Instructions to Class" text a
faculty types in the Assign dialog had nowhere to land for an individually-
assigned case, and was never read back for a section assignment either (it
only ever reached case_section_assignments.instructions, which nothing on
the student side joins against). Storing it directly on assigned_cases lets
both assignment paths (whole section, individual students) write and read it
the same way.

Revision ID: 0042
Revises: 0041
Create Date: 2026-11-18
"""

from alembic import op

revision = "0042"
down_revision = "0041"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE assigned_cases ADD COLUMN IF NOT EXISTS instructions TEXT;")


def downgrade():
    op.execute("ALTER TABLE assigned_cases DROP COLUMN IF EXISTS instructions;")
