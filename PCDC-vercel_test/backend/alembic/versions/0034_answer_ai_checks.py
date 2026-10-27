"""Store AI-written-content estimates for students' written answers, so the AI
check runs once per answer instead of on every faculty report view.

Faculty-only data: it is never returned to students.

Revision ID: 0034
Revises: 0033
Create Date: 2026-10-27
"""

from alembic import op

revision = "0034"
down_revision = "0033"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS answer_ai_checks (
            id SERIAL PRIMARY KEY,
            attempt_id INT NOT NULL REFERENCES case_study_attempts(id) ON DELETE CASCADE,
            question_id INT NOT NULL REFERENCES case_questions(id) ON DELETE CASCADE,
            ai_pct NUMERIC(5, 1) NOT NULL,
            reason TEXT,
            model VARCHAR(100),
            checked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (attempt_id, question_id)
        );
        """
    )


def downgrade():
    op.execute("DROP TABLE IF EXISTS answer_ai_checks;")
