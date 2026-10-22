"""Add the superadmin (Central Admin) role and institute ownership for admins.

- users.role may now be 'superadmin'.
- admin_institutions: which institutes an admin owns (many-to-many).
- users.admin_unrestricted: TRUE keeps an admin's original, platform-wide
  access. Every admin that exists when this migration runs is marked TRUE so
  their behaviour doesn't change; admins created afterwards default to FALSE
  and only see the institutes they own.
- institutions.created_by: audit trail of who created an institute.

No user's role is changed by this migration.

Revision ID: 0032
Revises: 0031
Create Date: 2026-10-21
"""

from alembic import op
from sqlalchemy import text

revision = "0032"
down_revision = "0031"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint("users_role_check", "users", type_="check")
    op.create_check_constraint(
        "users_role_check",
        "users",
        "role IN ('student', 'faculty', 'mentor', 'admin', 'director', 'superadmin')",
    )
    op.execute(
        """
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS admin_unrestricted BOOLEAN NOT NULL DEFAULT FALSE;

        UPDATE users SET admin_unrestricted = TRUE WHERE role = 'admin';

        CREATE TABLE IF NOT EXISTS admin_institutions (
            id SERIAL PRIMARY KEY,
            admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_admin_institutions UNIQUE (admin_id, institution_id)
        );
        CREATE INDEX IF NOT EXISTS ix_admin_institutions_institution
            ON admin_institutions (institution_id);

        ALTER TABLE institutions
            ADD COLUMN IF NOT EXISTS created_by INT REFERENCES users(id) ON DELETE SET NULL;
        """
    )


def downgrade():
    bind = op.get_bind()
    superadmins = bind.execute(
        text("SELECT COUNT(*) FROM users WHERE role = 'superadmin'")
    ).scalar()
    if superadmins:
        raise RuntimeError(
            f"Cannot downgrade 0032: {superadmins} superadmin user(s) exist. "
            "Change their role or remove them first."
        )
    op.execute(
        """
        ALTER TABLE institutions DROP COLUMN IF EXISTS created_by;
        DROP TABLE IF EXISTS admin_institutions;
        ALTER TABLE users DROP COLUMN IF EXISTS admin_unrestricted;
        """
    )
    op.drop_constraint("users_role_check", "users", type_="check")
    op.create_check_constraint(
        "users_role_check",
        "users",
        "role IN ('student', 'faculty', 'mentor', 'admin', 'director')",
    )
