"""Keep a restorable copy of every case study deleted from a Case Library.

When faculty (or an admin) delete a case from the library, its row, questions,
rapid-fire questions and tags are saved here first. The case's Case Bank entry
stays in the admin bank marked "Deleted by …", and an admin can restore the
case to its original creator. Student attempts and assignments are not kept.

Revision ID: 0035
Revises: 0034
Create Date: 2026-10-27
"""

from alembic import op

revision = "0035"
down_revision = "0034"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS deleted_case_studies (
            id SERIAL PRIMARY KEY,
            case_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            created_by INT REFERENCES users(id) ON DELETE SET NULL,
            deleted_by INT REFERENCES users(id) ON DELETE SET NULL,
            deleted_at TIMESTAMP NOT NULL DEFAULT NOW(),
            bank_entry_id INT REFERENCES case_study_bank(id) ON DELETE SET NULL,
            case_data JSONB NOT NULL,
            questions JSONB NOT NULL DEFAULT '[]',
            rapid_fire_questions JSONB NOT NULL DEFAULT '[]',
            tags JSONB NOT NULL DEFAULT '[]',
            restored_at TIMESTAMP,
            restored_by INT REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_deleted_case_studies_bank_entry
            ON deleted_case_studies(bank_entry_id);
        CREATE INDEX IF NOT EXISTS idx_deleted_case_studies_deleted_by
            ON deleted_case_studies(deleted_by);
        CREATE INDEX IF NOT EXISTS idx_deleted_case_studies_created_by
            ON deleted_case_studies(created_by);
        """
    )


def downgrade():
    op.execute("DROP TABLE IF EXISTS deleted_case_studies;")
