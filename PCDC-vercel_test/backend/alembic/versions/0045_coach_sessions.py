"""Saved Aish Coach conversations.

Each row is one coaching session for one user with one coach. messages holds
the turns ([{"role": "ai"|"student", "text": ...}]) and is rewritten after
every reply, so Previous Sessions on the Aish Coaches page lists real history
and a session can be reopened.

Revision ID: 0045
Revises: 0044
Create Date: 2026-11-20
"""

from alembic import op

revision = "0045"
down_revision = "0044"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS coach_sessions (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            coach_id VARCHAR(40) NOT NULL,
            messages JSONB NOT NULL DEFAULT '[]'::jsonb,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_coach_sessions_user_updated "
        "ON coach_sessions (user_id, updated_at DESC);"
    )


def downgrade():
    op.execute("DROP TABLE IF EXISTS coach_sessions;")
