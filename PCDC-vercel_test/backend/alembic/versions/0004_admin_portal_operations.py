"""Add admin portal operational support.

Revision ID: 0004
Revises: 0003
Create Date: 2026-07-01
"""

from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active',
            ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

        CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
        CREATE INDEX IF NOT EXISTS idx_users_program ON users(program);
        CREATE INDEX IF NOT EXISTS idx_users_admission_year ON users(admission_year);

        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'users_status_check'
            ) THEN
                ALTER TABLE users
                    ADD CONSTRAINT users_status_check
                    CHECK (status IN ('active', 'inactive'));
            END IF;
        END $$;

        CREATE TABLE IF NOT EXISTS login_events (
            id SERIAL PRIMARY KEY,
            user_id INT REFERENCES users(id) ON DELETE CASCADE,
            user_agent TEXT,
            ip_address VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_login_events_user_id
            ON login_events(user_id);
        CREATE INDEX IF NOT EXISTS idx_login_events_created_at
            ON login_events(created_at);

        CREATE TABLE IF NOT EXISTS system_events (
            id SERIAL PRIMARY KEY,
            actor_user_id INT REFERENCES users(id) ON DELETE SET NULL,
            event_type VARCHAR(100) NOT NULL,
            message TEXT NOT NULL,
            metadata TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_system_events_created_at
            ON system_events(created_at);

        CREATE TABLE IF NOT EXISTS notification_log (
            id SERIAL PRIMARY KEY,
            recipient_user_id INT REFERENCES users(id) ON DELETE SET NULL,
            event_type VARCHAR(100) NOT NULL,
            channel VARCHAR(30) NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'pending',
            subject TEXT,
            body TEXT,
            error_message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            sent_at TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_notification_log_recipient
            ON notification_log(recipient_user_id);
        CREATE INDEX IF NOT EXISTS idx_notification_log_status
            ON notification_log(status);
        CREATE INDEX IF NOT EXISTS idx_notification_log_channel
            ON notification_log(channel);

        CREATE TABLE IF NOT EXISTS notification_rules (
            id SERIAL PRIMARY KEY,
            event_type VARCHAR(100) NOT NULL,
            recipient_roles TEXT NOT NULL,
            channels TEXT NOT NULL,
            message_template TEXT,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS platform_settings (
            id SERIAL PRIMARY KEY,
            section VARCHAR(100) UNIQUE NOT NULL,
            config TEXT NOT NULL,
            updated_by INT REFERENCES users(id) ON DELETE SET NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS case_imports (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            source_type VARCHAR(80) NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'draft',
            original_filename VARCHAR(255),
            mapped_content TEXT,
            created_by INT REFERENCES users(id) ON DELETE SET NULL,
            approved_case_id INT REFERENCES case_studies(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_case_imports_status
            ON case_imports(status);
        """
    )


def downgrade():
    op.execute(
        """
        DROP TABLE IF EXISTS case_imports;
        DROP TABLE IF EXISTS platform_settings;
        DROP TABLE IF EXISTS notification_rules;
        DROP TABLE IF EXISTS notification_log;
        DROP TABLE IF EXISTS system_events;
        DROP TABLE IF EXISTS login_events;

        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
        DROP INDEX IF EXISTS idx_users_admission_year;
        DROP INDEX IF EXISTS idx_users_program;
        DROP INDEX IF EXISTS idx_users_status;
        ALTER TABLE users
            DROP COLUMN IF EXISTS updated_at,
            DROP COLUMN IF EXISTS last_login_at,
            DROP COLUMN IF EXISTS status;
        """
    )
