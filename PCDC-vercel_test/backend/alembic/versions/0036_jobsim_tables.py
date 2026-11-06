"""Job simulation (jobsim) tables.

Where simulations, their dataset and tasks, student attempts, answers and
scores are saved (handover section 9.2). All new tables start with jobsim_ so
nothing in the case study module (services/simulation) is touched.

Answer formulas and per-attempt expected values sit in their own tables
(jobsim_answer_formulas, jobsim_attempt_keys) so no student-facing query can
select them by accident.

Revision ID: 0036
Revises: 0035
Create Date: 2026-11-03
"""

from alembic import op

revision = "0036"
down_revision = "0035"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS jobsim_simulations (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            role VARCHAR(150),
            level VARCHAR(50),
            duration_minutes INT NOT NULL DEFAULT 60,
            course_id INT REFERENCES courses(id) ON DELETE SET NULL,
            subject VARCHAR(150),
            semester INT,
            weights JSONB NOT NULL DEFAULT '{"spreadsheet": 60, "memo": 20, "presentation": 20}',
            status VARCHAR(20) NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'approved', 'published', 'withdrawn')),
            dataset_spec JSONB,
            dataset JSONB NOT NULL DEFAULT '{"columns": [], "rows": []}',
            created_by INT REFERENCES users(id) ON DELETE SET NULL,
            approved_by INT REFERENCES users(id) ON DELETE SET NULL,
            published_by INT REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS jobsim_tasks (
            id SERIAL PRIMARY KEY,
            simulation_id INT NOT NULL REFERENCES jobsim_simulations(id) ON DELETE CASCADE,
            position INT NOT NULL,
            type VARCHAR(20) NOT NULL CHECK (type IN ('spreadsheet', 'memo', 'presentation')),
            stage VARCHAR(150),
            prompt_template TEXT NOT NULL,
            hint TEXT,
            config JSONB NOT NULL DEFAULT '{}',
            rubric JSONB,
            max_score NUMERIC(6, 2) NOT NULL DEFAULT 1,
            UNIQUE (simulation_id, position)
        );

        CREATE TABLE IF NOT EXISTS jobsim_answer_formulas (
            task_id INT PRIMARY KEY REFERENCES jobsim_tasks(id) ON DELETE CASCADE,
            formula TEXT NOT NULL,
            expected_format VARCHAR(20) NOT NULL DEFAULT 'general'
                CHECK (expected_format IN ('general', 'number', 'currency', 'percent')),
            verified_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS jobsim_capability_tags (
            simulation_id INT NOT NULL REFERENCES jobsim_simulations(id) ON DELETE CASCADE,
            capability_id INT NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
            PRIMARY KEY (simulation_id, capability_id)
        );

        CREATE TABLE IF NOT EXISTS jobsim_assignments (
            id SERIAL PRIMARY KEY,
            simulation_id INT NOT NULL REFERENCES jobsim_simulations(id) ON DELETE CASCADE,
            section_id INT REFERENCES class_sections(id) ON DELETE CASCADE,
            student_id INT REFERENCES students(id) ON DELETE CASCADE,
            due_date TIMESTAMP,
            status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
            assigned_by INT REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            CHECK (section_id IS NOT NULL OR student_id IS NOT NULL)
        );
        CREATE INDEX IF NOT EXISTS idx_jobsim_assignments_simulation
            ON jobsim_assignments(simulation_id);

        -- student_id is the student's users.id, as in case_study_attempts.
        CREATE TABLE IF NOT EXISTS jobsim_attempts (
            id SERIAL PRIMARY KEY,
            simulation_id INT NOT NULL REFERENCES jobsim_simulations(id) ON DELETE CASCADE,
            student_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            assignment_id INT REFERENCES jobsim_assignments(id) ON DELETE SET NULL,
            seed BIGINT NOT NULL,
            started_at TIMESTAMP NOT NULL DEFAULT NOW(),
            deadline_at TIMESTAMP NOT NULL,
            finished_at TIMESTAMP,
            status VARCHAR(20) NOT NULL DEFAULT 'in_progress'
                CHECK (status IN ('in_progress', 'submitted', 'scored')),
            cells JSONB NOT NULL DEFAULT '{}',
            memo JSONB,
            slides JSONB,
            last_task_id INT,
            total_score NUMERIC(6, 2),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
            UNIQUE (simulation_id, student_id)
        );

        CREATE TABLE IF NOT EXISTS jobsim_attempt_keys (
            attempt_id INT NOT NULL REFERENCES jobsim_attempts(id) ON DELETE CASCADE,
            task_id INT NOT NULL REFERENCES jobsim_tasks(id) ON DELETE CASCADE,
            expected_value JSONB,
            expected_format VARCHAR(20) NOT NULL,
            PRIMARY KEY (attempt_id, task_id)
        );

        CREATE TABLE IF NOT EXISTS jobsim_task_results (
            id SERIAL PRIMARY KEY,
            attempt_id INT NOT NULL REFERENCES jobsim_attempts(id) ON DELETE CASCADE,
            task_id INT NOT NULL REFERENCES jobsim_tasks(id) ON DELETE CASCADE,
            status VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'correct', 'incorrect', 'scoring', 'scored')),
            score NUMERIC(6, 2),
            check_count INT NOT NULL DEFAULT 0,
            hint_used BOOLEAN NOT NULL DEFAULT FALSE,
            marked_by VARCHAR(20) CHECK (marked_by IN ('auto', 'ai', 'faculty')),
            ai_feedback JSONB,
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
            UNIQUE (attempt_id, task_id)
        );

        CREATE TABLE IF NOT EXISTS jobsim_check_log (
            id SERIAL PRIMARY KEY,
            attempt_id INT NOT NULL REFERENCES jobsim_attempts(id) ON DELETE CASCADE,
            task_id INT NOT NULL REFERENCES jobsim_tasks(id) ON DELETE CASCADE,
            raw_input TEXT NOT NULL,
            value_seen TEXT,
            format_seen VARCHAR(20),
            is_correct BOOLEAN NOT NULL,
            reason VARCHAR(40),
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_jobsim_check_log_attempt
            ON jobsim_check_log(attempt_id, task_id);

        CREATE TABLE IF NOT EXISTS jobsim_score_overrides (
            id SERIAL PRIMARY KEY,
            task_result_id INT NOT NULL REFERENCES jobsim_task_results(id) ON DELETE CASCADE,
            original_score NUMERIC(6, 2),
            new_score NUMERIC(6, 2) NOT NULL,
            changed_by INT REFERENCES users(id) ON DELETE SET NULL,
            changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
            note TEXT
        );

        CREATE TABLE IF NOT EXISTS jobsim_jobs (
            id SERIAL PRIMARY KEY,
            kind VARCHAR(20) NOT NULL CHECK (kind IN ('draft', 'score', 'similarity', 'sweep')),
            payload JSONB NOT NULL DEFAULT '{}',
            status VARCHAR(20) NOT NULL DEFAULT 'queued'
                CHECK (status IN ('queued', 'running', 'done', 'failed')),
            attempts INT NOT NULL DEFAULT 0,
            run_after TIMESTAMP NOT NULL DEFAULT NOW(),
            error TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            finished_at TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_jobsim_jobs_due ON jobsim_jobs(status, run_after);
        """
    )


def downgrade():
    op.execute(
        """
        DROP TABLE IF EXISTS jobsim_jobs;
        DROP TABLE IF EXISTS jobsim_score_overrides;
        DROP TABLE IF EXISTS jobsim_check_log;
        DROP TABLE IF EXISTS jobsim_task_results;
        DROP TABLE IF EXISTS jobsim_attempt_keys;
        DROP TABLE IF EXISTS jobsim_attempts;
        DROP TABLE IF EXISTS jobsim_assignments;
        DROP TABLE IF EXISTS jobsim_capability_tags;
        DROP TABLE IF EXISTS jobsim_answer_formulas;
        DROP TABLE IF EXISTS jobsim_tasks;
        DROP TABLE IF EXISTS jobsim_simulations;
        """
    )
