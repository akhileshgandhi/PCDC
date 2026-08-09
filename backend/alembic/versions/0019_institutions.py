"""Add institutions as the top level of the academic structure.

Revision ID: 0019
Revises: 0018
Create Date: 2026-08-06
"""

from alembic import op

revision = "0019"
down_revision = "0018"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS institutions (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(50) UNIQUE NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        ALTER TABLE departments
            ADD COLUMN IF NOT EXISTS institution_id INT REFERENCES institutions(id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_departments_institution_id ON departments(institution_id);

        INSERT INTO institutions (name, code) VALUES
            ('PIMR PG', 'PIMR-PG'),
            ('PIMR UG', 'PIMR-UG'),
            ('PIMR LAW', 'PIMR-LAW'),
            ('PIBM', 'PIBM')
        ON CONFLICT (code) DO NOTHING;
        """
    )


def downgrade():
    op.execute(
        """
        ALTER TABLE departments DROP COLUMN IF EXISTS institution_id;
        DROP TABLE IF EXISTS institutions;
        """
    )
