"""Add password_setup_tokens for invite / set-password links.

Revision ID: 0021
Revises: 0020
Create Date: 2026-08-09
"""

from alembic import op

revision = "0021"
down_revision = "0020"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS password_setup_tokens (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash VARCHAR(64) NOT NULL UNIQUE,
            purpose VARCHAR(30) NOT NULL DEFAULT 'invite',
            expires_at TIMESTAMPTZ NOT NULL,
            used_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_password_setup_tokens_user "
        "ON password_setup_tokens (user_id);"
    )


def downgrade():
    op.execute("DROP TABLE IF EXISTS password_setup_tokens;")
