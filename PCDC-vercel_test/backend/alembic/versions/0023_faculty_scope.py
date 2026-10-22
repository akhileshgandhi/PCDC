"""Add faculty_scope so an admin can restrict which institutions/departments a
faculty can pick from during onboarding.

Revision ID: 0023
Revises: 0022
Create Date: 2026-08-10
"""

from alembic import op

revision = "0023"
down_revision = "0022"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS faculty_scope (
            id SERIAL PRIMARY KEY,
            faculty_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
            department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_faculty_scope_faculty ON faculty_scope (faculty_id);"
    )


def downgrade():
    op.execute("DROP TABLE IF EXISTS faculty_scope;")
