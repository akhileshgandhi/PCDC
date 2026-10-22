"""Drop the pedagogical word from case_studies.difficulty_label — the client
wants just "Level N" shown everywhere in the UI, not "Level N — Decision
Making". The word itself is still used internally to brief the AI on what
each difficulty level means when generating case content; it's just no
longer the stored/displayed label.

Revision ID: 0031
Revises: 0030
Create Date: 2026-10-01
"""

from alembic import op

revision = "0031"
down_revision = "0030"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        UPDATE case_studies
        SET difficulty_label = 'Level ' || GREATEST(1, LEAST(difficulty, 5))
        WHERE difficulty IS NOT NULL
        """
    )


def downgrade():
    op.execute(
        """
        UPDATE case_studies
        SET difficulty_label = CASE GREATEST(1, LEAST(difficulty, 5))
            WHEN 1 THEN 'Observation'
            WHEN 2 THEN 'Analysis'
            WHEN 3 THEN 'Decision Making'
            WHEN 4 THEN 'Leadership'
            WHEN 5 THEN 'Strategic Thinking'
        END
        WHERE difficulty IS NOT NULL
        """
    )
