"""Shared Case Study Bank.

A cross-faculty library of case studies, visible to every faculty and admin.
Entries are either uploaded (mapped to subject / semester / difficulty) or
AI-generated (stored automatically whenever faculty AI-generates a case).
Any faculty can publish a bank entry into their own Case Library; an entry
published AS-IS is hidden from the bank while that unmodified copy lives
(status='used'), and reappears when the copy is edited or deleted.

Revision ID: 0026
Revises: 0025
Create Date: 2026-08-24
"""

from alembic import op

revision = "0026"
down_revision = "0025"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS case_study_bank (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            brief TEXT,
            case_snapshot TEXT,
            subject VARCHAR(120),
            semester_number INT,
            difficulty INT NOT NULL DEFAULT 1,
            source VARCHAR(20) NOT NULL DEFAULT 'uploaded',
            created_by INT REFERENCES users(id) ON DELETE SET NULL,
            creator_name VARCHAR(255),
            origin_case_id INT REFERENCES case_studies(id) ON DELETE SET NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'available',
            used_case_id INT REFERENCES case_studies(id) ON DELETE SET NULL,
            attachment_name VARCHAR(255),
            attachment_data TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_bank_status ON case_study_bank(status);
        CREATE INDEX IF NOT EXISTS idx_bank_subject ON case_study_bank(subject);
        CREATE INDEX IF NOT EXISTS idx_bank_semester ON case_study_bank(semester_number);
        CREATE INDEX IF NOT EXISTS idx_bank_difficulty ON case_study_bank(difficulty);
        CREATE INDEX IF NOT EXISTS idx_bank_source ON case_study_bank(source);
        CREATE INDEX IF NOT EXISTS idx_bank_created_by ON case_study_bank(created_by);
        CREATE INDEX IF NOT EXISTS idx_bank_used_case_id ON case_study_bank(used_case_id);
        CREATE UNIQUE INDEX IF NOT EXISTS uq_bank_origin_case_id
            ON case_study_bank(origin_case_id) WHERE origin_case_id IS NOT NULL;
        """
    )


def downgrade():
    op.execute("DROP TABLE IF EXISTS case_study_bank;")
