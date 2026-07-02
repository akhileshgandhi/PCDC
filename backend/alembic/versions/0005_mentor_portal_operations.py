"""Add mentor portal operational support.

Revision ID: 0005
Revises: 0004
Create Date: 2026-07-02
"""

from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        ALTER TABLE interventions
            ADD COLUMN IF NOT EXISTS intervention_type VARCHAR(50) DEFAULT 'note',
            ADD COLUMN IF NOT EXISTS follow_up_date DATE,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

        CREATE INDEX IF NOT EXISTS idx_interventions_mentor_id
            ON interventions(mentor_id);
        CREATE INDEX IF NOT EXISTS idx_interventions_created_at
            ON interventions(created_at);

        CREATE TABLE IF NOT EXISTS sessions (
            id SERIAL PRIMARY KEY,
            mentor_id INT REFERENCES users(id) ON DELETE CASCADE,
            session_type VARCHAR(30) NOT NULL,
            agenda TEXT,
            scheduled_at TIMESTAMP NOT NULL,
            completed_at TIMESTAMP,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_sessions_mentor_id
            ON sessions(mentor_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_at
            ON sessions(scheduled_at);

        CREATE TABLE IF NOT EXISTS session_students (
            id SERIAL PRIMARY KEY,
            session_id INT REFERENCES sessions(id) ON DELETE CASCADE,
            student_id INT REFERENCES students(id) ON DELETE CASCADE,
            notified_at TIMESTAMP
        );

        CREATE UNIQUE INDEX IF NOT EXISTS uq_session_students_session_student
            ON session_students(session_id, student_id);
        CREATE INDEX IF NOT EXISTS idx_session_students_student_id
            ON session_students(student_id);

        CREATE TABLE IF NOT EXISTS mentor_attempt_comments (
            id SERIAL PRIMARY KEY,
            attempt_id INT REFERENCES case_study_attempts(id) ON DELETE CASCADE,
            mentor_id INT REFERENCES users(id) ON DELETE CASCADE,
            stage VARCHAR(40) NOT NULL,
            comment_text TEXT NOT NULL,
            flagged_for_session BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_mentor_attempt_comments_attempt_id
            ON mentor_attempt_comments(attempt_id);
        CREATE INDEX IF NOT EXISTS idx_mentor_attempt_comments_mentor_id
            ON mentor_attempt_comments(mentor_id);

        CREATE TABLE IF NOT EXISTS alerts (
            id SERIAL PRIMARY KEY,
            mentor_id INT REFERENCES users(id) ON DELETE CASCADE,
            student_id INT REFERENCES students(id) ON DELETE CASCADE,
            alert_type VARCHAR(50) NOT NULL,
            severity VARCHAR(20) NOT NULL,
            message TEXT NOT NULL,
            metadata TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            dismissed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_alerts_mentor_id
            ON alerts(mentor_id);
        CREATE INDEX IF NOT EXISTS idx_alerts_student_id
            ON alerts(student_id);
        CREATE INDEX IF NOT EXISTS idx_alerts_status
            ON alerts(status);
        CREATE INDEX IF NOT EXISTS idx_alerts_created_at
            ON alerts(created_at);
        """
    )


def downgrade():
    op.execute(
        """
        DROP TABLE IF EXISTS alerts;
        DROP TABLE IF EXISTS mentor_attempt_comments;
        DROP TABLE IF EXISTS session_students;
        DROP TABLE IF EXISTS sessions;

        DROP INDEX IF EXISTS idx_interventions_created_at;
        DROP INDEX IF EXISTS idx_interventions_mentor_id;
        ALTER TABLE interventions
            DROP COLUMN IF EXISTS updated_at,
            DROP COLUMN IF EXISTS follow_up_date,
            DROP COLUMN IF EXISTS intervention_type;
        """
    )
