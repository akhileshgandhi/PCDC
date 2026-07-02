"""Add dynamic data mapping support.

Revision ID: 0006
Revises: 0005
Create Date: 2026-07-02
"""

from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS assigned_cases (
            id SERIAL PRIMARY KEY,
            student_id INT REFERENCES students(id) ON DELETE CASCADE,
            case_study_id INT REFERENCES case_studies(id) ON DELETE CASCADE,
            assigned_by INT REFERENCES users(id) ON DELETE SET NULL,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            started_attempt_id INT REFERENCES case_study_attempts(id) ON DELETE SET NULL,
            completed_at TIMESTAMP,
            UNIQUE (student_id, case_study_id)
        );

        CREATE INDEX IF NOT EXISTS idx_assigned_cases_student_id
            ON assigned_cases(student_id);
        CREATE INDEX IF NOT EXISTS idx_assigned_cases_case_study_id
            ON assigned_cases(case_study_id);
        CREATE INDEX IF NOT EXISTS idx_assigned_cases_assigned_by
            ON assigned_cases(assigned_by);
        CREATE INDEX IF NOT EXISTS idx_assigned_cases_status
            ON assigned_cases(status);
        """
    )


def downgrade():
    op.execute("DROP TABLE IF EXISTS assigned_cases;")
