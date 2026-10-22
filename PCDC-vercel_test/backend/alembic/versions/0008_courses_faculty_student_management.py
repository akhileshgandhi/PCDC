"""Add courses, semesters, batches, class sections, and section-based
faculty/student/case assignment support.

Revision ID: 0008
Revises: 0007
Create Date: 2026-07-02
"""

from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS courses (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            code VARCHAR(20) UNIQUE NOT NULL,
            total_semesters INT NOT NULL,
            duration_years INT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS semesters (
            id SERIAL PRIMARY KEY,
            course_id INT REFERENCES courses(id) ON DELETE CASCADE,
            semester_number INT NOT NULL,
            name VARCHAR(30) NOT NULL,
            UNIQUE (course_id, semester_number)
        );

        CREATE INDEX IF NOT EXISTS idx_semesters_course_id ON semesters(course_id);

        CREATE TABLE IF NOT EXISTS batches (
            id SERIAL PRIMARY KEY,
            course_id INT REFERENCES courses(id) ON DELETE CASCADE,
            name VARCHAR(50) NOT NULL,
            start_year INT NOT NULL,
            end_year INT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_batches_course_id ON batches(course_id);

        CREATE TABLE IF NOT EXISTS class_sections (
            id SERIAL PRIMARY KEY,
            course_id INT REFERENCES courses(id) ON DELETE CASCADE,
            semester_id INT REFERENCES semesters(id) ON DELETE CASCADE,
            batch_id INT REFERENCES batches(id) ON DELETE CASCADE,
            name VARCHAR(50) NOT NULL,
            academic_year VARCHAR(10),
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (course_id, semester_id, batch_id, name)
        );

        CREATE INDEX IF NOT EXISTS idx_class_sections_course_id ON class_sections(course_id);
        CREATE INDEX IF NOT EXISTS idx_class_sections_semester_id ON class_sections(semester_id);
        CREATE INDEX IF NOT EXISTS idx_class_sections_batch_id ON class_sections(batch_id);

        CREATE TABLE IF NOT EXISTS faculty_sections (
            id SERIAL PRIMARY KEY,
            faculty_id INT REFERENCES users(id) ON DELETE CASCADE,
            section_id INT REFERENCES class_sections(id) ON DELETE CASCADE,
            subject VARCHAR(100),
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            assigned_by INT REFERENCES users(id) ON DELETE SET NULL,
            UNIQUE (faculty_id, section_id, subject)
        );

        CREATE INDEX IF NOT EXISTS idx_faculty_sections_faculty_id ON faculty_sections(faculty_id);
        CREATE INDEX IF NOT EXISTS idx_faculty_sections_section_id ON faculty_sections(section_id);

        CREATE TABLE IF NOT EXISTS student_sections (
            id SERIAL PRIMARY KEY,
            student_id INT REFERENCES students(id) ON DELETE CASCADE,
            section_id INT REFERENCES class_sections(id) ON DELETE CASCADE,
            enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            enrolled_by INT REFERENCES users(id) ON DELETE SET NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'active'
        );

        CREATE INDEX IF NOT EXISTS idx_student_sections_student_id ON student_sections(student_id);
        CREATE INDEX IF NOT EXISTS idx_student_sections_section_id ON student_sections(section_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_student_sections_one_active
            ON student_sections(student_id) WHERE status = 'active';

        CREATE TABLE IF NOT EXISTS case_section_assignments (
            id SERIAL PRIMARY KEY,
            case_study_id INT REFERENCES case_studies(id) ON DELETE CASCADE,
            section_id INT REFERENCES class_sections(id) ON DELETE CASCADE,
            assigned_by INT REFERENCES users(id) ON DELETE SET NULL,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            due_date TIMESTAMP,
            instructions TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            UNIQUE (case_study_id, section_id)
        );

        CREATE INDEX IF NOT EXISTS idx_case_section_assignments_case_study_id
            ON case_section_assignments(case_study_id);
        CREATE INDEX IF NOT EXISTS idx_case_section_assignments_section_id
            ON case_section_assignments(section_id);

        ALTER TABLE students
            ADD COLUMN IF NOT EXISTS course_id INT REFERENCES courses(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS batch_id INT REFERENCES batches(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS current_section_id INT REFERENCES class_sections(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS current_semester_number INT;

        CREATE INDEX IF NOT EXISTS idx_students_course_id ON students(course_id);
        CREATE INDEX IF NOT EXISTS idx_students_batch_id ON students(batch_id);
        CREATE INDEX IF NOT EXISTS idx_students_current_section_id ON students(current_section_id);

        ALTER TABLE case_studies
            ADD COLUMN IF NOT EXISTS recommended_semesters TEXT,
            ADD COLUMN IF NOT EXISTS recommended_course_ids TEXT;

        ALTER TABLE assigned_cases
            ADD COLUMN IF NOT EXISTS assignment_source VARCHAR(20) NOT NULL DEFAULT 'mentor',
            ADD COLUMN IF NOT EXISTS section_assignment_id INT REFERENCES case_section_assignments(id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_assigned_cases_section_assignment_id
            ON assigned_cases(section_assignment_id);
        """
    )


def downgrade():
    op.execute(
        """
        ALTER TABLE assigned_cases
            DROP COLUMN IF EXISTS section_assignment_id,
            DROP COLUMN IF EXISTS assignment_source;

        ALTER TABLE case_studies
            DROP COLUMN IF EXISTS recommended_course_ids,
            DROP COLUMN IF EXISTS recommended_semesters;

        ALTER TABLE students
            DROP COLUMN IF EXISTS current_semester_number,
            DROP COLUMN IF EXISTS current_section_id,
            DROP COLUMN IF EXISTS batch_id,
            DROP COLUMN IF EXISTS course_id;

        DROP TABLE IF EXISTS case_section_assignments;
        DROP TABLE IF EXISTS student_sections;
        DROP TABLE IF EXISTS faculty_sections;
        DROP TABLE IF EXISTS class_sections;
        DROP TABLE IF EXISTS batches;
        DROP TABLE IF EXISTS semesters;
        DROP TABLE IF EXISTS courses;
        """
    )
