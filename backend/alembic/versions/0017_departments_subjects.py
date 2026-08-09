"""Add departments and subjects as first-class academic entities.

Revision ID: 0017
Revises: 0016
Create Date: 2026-08-06
"""

from alembic import op

revision = "0017"
down_revision = "0016"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS departments (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(50) UNIQUE NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        ALTER TABLE courses
            ADD COLUMN IF NOT EXISTS department_id INT REFERENCES departments(id) ON DELETE SET NULL;

        CREATE TABLE IF NOT EXISTS subjects (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(50),
            department_id INT REFERENCES departments(id) ON DELETE SET NULL,
            course_id INT REFERENCES courses(id) ON DELETE SET NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_courses_department_id ON courses(department_id);
        CREATE INDEX IF NOT EXISTS idx_subjects_department_id ON subjects(department_id);
        CREATE INDEX IF NOT EXISTS idx_subjects_course_id ON subjects(course_id);
        """
    )


def downgrade():
    op.execute(
        """
        DROP TABLE IF EXISTS subjects;
        ALTER TABLE courses DROP COLUMN IF EXISTS department_id;
        DROP TABLE IF EXISTS departments;
        """
    )
