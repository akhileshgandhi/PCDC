"""Allow director user role.

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-29
"""

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint("users_role_check", "users", type_="check")
    op.create_check_constraint(
        "users_role_check",
        "users",
        "role IN ('student', 'faculty', 'mentor', 'admin', 'director')",
    )


def downgrade():
    op.drop_constraint("users_role_check", "users", type_="check")
    op.create_check_constraint(
        "users_role_check",
        "users",
        "role IN ('student', 'faculty', 'mentor', 'admin')",
    )
