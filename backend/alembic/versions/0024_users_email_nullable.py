"""Allow users.email to be NULL so students added by scholar number don't need a
fabricated @pcdc.local address. Login still works via the scholar number
(users.college_id). The unique constraint permits multiple NULLs in Postgres.

Revision ID: 0024
Revises: 0023
Create Date: 2026-08-11
"""

from alembic import op

revision = "0024"
down_revision = "0023"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE users ALTER COLUMN email DROP NOT NULL;")


def downgrade():
    # Backfill any NULLs before restoring the constraint.
    op.execute(
        "UPDATE users SET email = COALESCE(email, college_id || '@pcdc.local', 'user' || id || '@pcdc.local') "
        "WHERE email IS NULL;"
    )
    op.execute("ALTER TABLE users ALTER COLUMN email SET NOT NULL;")
