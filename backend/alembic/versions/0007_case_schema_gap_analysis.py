"""Add stakeholder case schema support.

Revision ID: 0007
Revises: 0006
Create Date: 2026-07-02
"""

from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        ALTER TABLE case_studies
            ADD COLUMN IF NOT EXISTS case_code VARCHAR(40) UNIQUE,
            ADD COLUMN IF NOT EXISTS volume VARCHAR(80),
            ADD COLUMN IF NOT EXISTS subject VARCHAR(80),
            ADD COLUMN IF NOT EXISTS functional_area VARCHAR(140),
            ADD COLUMN IF NOT EXISTS capability_category VARCHAR(80),
            ADD COLUMN IF NOT EXISTS blooms_levels TEXT,
            ADD COLUMN IF NOT EXISTS target_learners VARCHAR(140),
            ADD COLUMN IF NOT EXISTS difficulty_label VARCHAR(40),
            ADD COLUMN IF NOT EXISTS reading_time_minutes INTEGER,
            ADD COLUMN IF NOT EXISTS answer_writing_time_minutes INTEGER,
            ADD COLUMN IF NOT EXISTS rapid_fire_time_minutes INTEGER,
            ADD COLUMN IF NOT EXISTS total_marks NUMERIC(4,1) DEFAULT 10,
            ADD COLUMN IF NOT EXISTS written_marks NUMERIC(4,1) DEFAULT 7,
            ADD COLUMN IF NOT EXISTS rapid_fire_marks NUMERIC(4,1) DEFAULT 3,
            ADD COLUMN IF NOT EXISTS student_instructions_before TEXT,
            ADD COLUMN IF NOT EXISTS student_instructions_during TEXT,
            ADD COLUMN IF NOT EXISTS student_instructions_submission TEXT,
            ADD COLUMN IF NOT EXISTS company_background TEXT,
            ADD COLUMN IF NOT EXISTS industry_background TEXT,
            ADD COLUMN IF NOT EXISTS faculty_common_mistakes TEXT,
            ADD COLUMN IF NOT EXISTS faculty_discussion_points TEXT,
            ADD COLUMN IF NOT EXISTS key_learning_points TEXT;

        CREATE INDEX IF NOT EXISTS idx_case_studies_case_code
            ON case_studies(case_code);
        CREATE INDEX IF NOT EXISTS idx_case_studies_subject
            ON case_studies(subject);
        CREATE INDEX IF NOT EXISTS idx_case_studies_difficulty_label
            ON case_studies(difficulty_label);

        ALTER TABLE case_study_attempts
            ADD COLUMN IF NOT EXISTS marks_written NUMERIC(4,1),
            ADD COLUMN IF NOT EXISTS marks_rapid_fire NUMERIC(4,1),
            ADD COLUMN IF NOT EXISTS marks_total NUMERIC(4,1),
            ADD COLUMN IF NOT EXISTS eligible_for_evaluation BOOLEAN DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS reading_time_spent INTEGER,
            ADD COLUMN IF NOT EXISTS writing_time_spent INTEGER,
            ADD COLUMN IF NOT EXISTS rapid_fire_time_spent INTEGER;

        CREATE TABLE IF NOT EXISTS case_questions (
            id SERIAL PRIMARY KEY,
            case_study_id INT REFERENCES case_studies(id) ON DELETE CASCADE,
            question_number INTEGER NOT NULL,
            question_text TEXT NOT NULL,
            marks NUMERIC(4,1) NOT NULL DEFAULT 0,
            blooms_level VARCHAR(40),
            word_limit_min INTEGER,
            word_limit_max INTEGER,
            instructions TEXT,
            model_answer TEXT,
            alternative_answers TEXT,
            marking_scheme TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (case_study_id, question_number)
        );

        CREATE INDEX IF NOT EXISTS idx_case_questions_case_study_id
            ON case_questions(case_study_id);

        CREATE TABLE IF NOT EXISTS rapid_fire_questions (
            id SERIAL PRIMARY KEY,
            case_study_id INT REFERENCES case_studies(id) ON DELETE CASCADE,
            sequence INTEGER NOT NULL,
            question_text TEXT NOT NULL,
            answer_text TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (case_study_id, sequence)
        );

        CREATE INDEX IF NOT EXISTS idx_rapid_fire_questions_case_study_id
            ON rapid_fire_questions(case_study_id);

        CREATE TABLE IF NOT EXISTS case_question_responses (
            id SERIAL PRIMARY KEY,
            attempt_id INT REFERENCES case_study_attempts(id) ON DELETE CASCADE,
            question_id INT REFERENCES case_questions(id) ON DELETE CASCADE,
            response_text TEXT,
            word_count INTEGER,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ai_score NUMERIC(4,1),
            ai_feedback TEXT,
            UNIQUE (attempt_id, question_id)
        );

        CREATE INDEX IF NOT EXISTS idx_case_question_responses_attempt_id
            ON case_question_responses(attempt_id);

        CREATE TABLE IF NOT EXISTS rapid_fire_responses (
            id SERIAL PRIMARY KEY,
            attempt_id INT REFERENCES case_study_attempts(id) ON DELETE CASCADE,
            rapid_fire_question_id INT REFERENCES rapid_fire_questions(id) ON DELETE CASCADE,
            response_text TEXT,
            is_correct BOOLEAN,
            marks_awarded NUMERIC(3,1),
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (attempt_id, rapid_fire_question_id)
        );

        CREATE INDEX IF NOT EXISTS idx_rapid_fire_responses_attempt_id
            ON rapid_fire_responses(attempt_id);
        """
    )


def downgrade():
    op.execute(
        """
        DROP TABLE IF EXISTS rapid_fire_responses;
        DROP TABLE IF EXISTS case_question_responses;
        DROP TABLE IF EXISTS rapid_fire_questions;
        DROP TABLE IF EXISTS case_questions;

        ALTER TABLE case_study_attempts
            DROP COLUMN IF EXISTS rapid_fire_time_spent,
            DROP COLUMN IF EXISTS writing_time_spent,
            DROP COLUMN IF EXISTS reading_time_spent,
            DROP COLUMN IF EXISTS eligible_for_evaluation,
            DROP COLUMN IF EXISTS marks_total,
            DROP COLUMN IF EXISTS marks_rapid_fire,
            DROP COLUMN IF EXISTS marks_written;

        DROP INDEX IF EXISTS idx_case_studies_difficulty_label;
        DROP INDEX IF EXISTS idx_case_studies_subject;
        DROP INDEX IF EXISTS idx_case_studies_case_code;

        ALTER TABLE case_studies
            DROP COLUMN IF EXISTS key_learning_points,
            DROP COLUMN IF EXISTS faculty_discussion_points,
            DROP COLUMN IF EXISTS faculty_common_mistakes,
            DROP COLUMN IF EXISTS industry_background,
            DROP COLUMN IF EXISTS company_background,
            DROP COLUMN IF EXISTS student_instructions_submission,
            DROP COLUMN IF EXISTS student_instructions_during,
            DROP COLUMN IF EXISTS student_instructions_before,
            DROP COLUMN IF EXISTS rapid_fire_marks,
            DROP COLUMN IF EXISTS written_marks,
            DROP COLUMN IF EXISTS total_marks,
            DROP COLUMN IF EXISTS rapid_fire_time_minutes,
            DROP COLUMN IF EXISTS answer_writing_time_minutes,
            DROP COLUMN IF EXISTS reading_time_minutes,
            DROP COLUMN IF EXISTS difficulty_label,
            DROP COLUMN IF EXISTS target_learners,
            DROP COLUMN IF EXISTS blooms_levels,
            DROP COLUMN IF EXISTS capability_category,
            DROP COLUMN IF EXISTS functional_area,
            DROP COLUMN IF EXISTS subject,
            DROP COLUMN IF EXISTS volume,
            DROP COLUMN IF EXISTS case_code;
        """
    )
