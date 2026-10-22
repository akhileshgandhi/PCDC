"""Add Active Engagements Simulations box support: tag capabilities with
engagement_type/capability_group, add simulation_capability_scores, and seed
the 20 Simulations capabilities (Think/Lead/Execute/Grow x 5).

Revision ID: 0010
Revises: 0009
Create Date: 2026-07-07
"""

from alembic import op
from sqlalchemy import text

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None

SIMULATION_CAPABILITIES = [
    ("think", "Strategic Thinking"),
    ("think", "Analytical Thinking"),
    ("think", "Problem Solving"),
    ("think", "Decision Making"),
    ("think", "Business Acumen"),
    ("lead", "Leadership"),
    ("lead", "Communication"),
    ("lead", "Teamwork"),
    ("lead", "Emotional Intelligence"),
    ("lead", "Negotiation"),
    ("execute", "Planning & Execution"),
    ("execute", "Project Management"),
    ("execute", "Time Management"),
    ("execute", "Accountability"),
    ("execute", "Result Orientation"),
    ("grow", "Innovation"),
    ("grow", "Adaptability"),
    ("grow", "Learning Agility"),
    ("grow", "Professional Ethics"),
    ("grow", "AI & Digital Literacy"),
]


def upgrade():
    op.execute(
        """
        ALTER TABLE capabilities
            ADD COLUMN IF NOT EXISTS engagement_type VARCHAR(20) NOT NULL DEFAULT 'case_study',
            ADD COLUMN IF NOT EXISTS capability_group VARCHAR(20);

        CREATE INDEX IF NOT EXISTS idx_capabilities_engagement_type
            ON capabilities(engagement_type);

        CREATE TABLE IF NOT EXISTS simulation_capability_scores (
            id              SERIAL PRIMARY KEY,
            student_id      INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            attempt_id      INT NOT NULL REFERENCES simulation_attempts(id) ON DELETE CASCADE,
            capability_id   INT NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
            score           NUMERIC(5,2) NOT NULL,
            created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_simulation_capability_scores_student_id
            ON simulation_capability_scores(student_id);
        CREATE INDEX IF NOT EXISTS idx_simulation_capability_scores_attempt_id
            ON simulation_capability_scores(attempt_id);
        CREATE INDEX IF NOT EXISTS idx_simulation_capability_scores_capability_id
            ON simulation_capability_scores(capability_id);
        """
    )

    conn = op.get_bind()
    insert_stmt = text(
        """
        INSERT INTO capabilities (name, weightage, engagement_type, capability_group)
        SELECT :name, 1, 'simulation', :group
        WHERE NOT EXISTS (
            SELECT 1 FROM capabilities
            WHERE name = :name AND engagement_type = 'simulation'
        )
        """
    )
    for group, name in SIMULATION_CAPABILITIES:
        conn.execute(insert_stmt, {"name": name, "group": group})


def downgrade():
    op.execute(
        """
        DELETE FROM capabilities WHERE engagement_type = 'simulation';

        DROP TABLE IF EXISTS simulation_capability_scores;

        ALTER TABLE capabilities
            DROP COLUMN IF EXISTS capability_group,
            DROP COLUMN IF EXISTS engagement_type;
        """
    )
