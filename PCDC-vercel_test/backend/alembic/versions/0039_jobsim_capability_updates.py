"""Job simulation scores feed the student's capability profile.

One row per finished attempt whose weighted total has been applied to
student_capabilities. The primary key makes the update happen once per
attempt, even when the last memo score and a faculty mark arrive together.
jobsim_attempts.status is left as it is (the frontend reads it).

Revision ID: 0039
Revises: 0038
Create Date: 2026-11-12
"""

from alembic import op

revision = "0039"
down_revision = "0038"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS jobsim_capability_updates (
            attempt_id INT PRIMARY KEY REFERENCES jobsim_attempts(id) ON DELETE CASCADE,
            simulation_id INT NOT NULL REFERENCES jobsim_simulations(id) ON DELETE CASCADE,
            student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            weighted_score NUMERIC(5, 2) NOT NULL,
            breakdown JSONB NOT NULL DEFAULT '{}',
            applied_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_jobsim_capability_updates_student
            ON jobsim_capability_updates(student_id);
        """
    )


def downgrade():
    op.execute("DROP TABLE IF EXISTS jobsim_capability_updates")
