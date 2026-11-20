"""Seed the career tracks students pick on the Career Pathway page.

The career_tracks table existed since 0001 but no migration filled it, so
students had nothing to choose. Inserts the standard tracks (the list noted
in 0002) by name, skipping any that already exist, so it is safe on
databases where tracks were added by hand.

Revision ID: 0044
Revises: 0043
Create Date: 2026-11-20
"""

from alembic import op
import sqlalchemy as sa

revision = "0044"
down_revision = "0043"
branch_labels = None
depends_on = None

TRACKS = [
    ("Consulting", "Structure ambiguous business problems and advise clients on what to do next."),
    ("Finance", "Analyse numbers, value decisions and manage money, risk and investment."),
    ("Marketing", "Understand customers, build brands and grow demand for products."),
    ("Human Resources", "Hire, develop and keep people, and build healthy workplaces."),
    ("Operations", "Run processes, supply chains and service delivery efficiently."),
    ("Entrepreneurship", "Spot opportunities and build new ventures from the ground up."),
    ("Family Business", "Grow and professionalise a family-owned business across generations."),
    ("Analytics", "Turn data into insight and evidence for better decisions."),
    ("Sales Leadership", "Win customers, lead sales teams and hit revenue targets."),
    ("General Management", "Lead teams and balance every function to run a business as a whole."),
]


def upgrade():
    insert = sa.text("""
        INSERT INTO career_tracks (name, description)
        SELECT CAST(:name AS VARCHAR), CAST(:description AS TEXT)
        WHERE NOT EXISTS (SELECT 1 FROM career_tracks WHERE LOWER(name) = LOWER(:name))
    """)
    bind = op.get_bind()
    for name, description in TRACKS:
        bind.execute(insert, {"name": name, "description": description})


def downgrade():
    # Only remove tracks no student has chosen.
    bind = op.get_bind()
    for name, _ in TRACKS:
        bind.execute(
            sa.text("""
                DELETE FROM career_tracks ct
                WHERE ct.name = :name
                  AND NOT EXISTS (SELECT 1 FROM students s WHERE s.career_track_id = ct.id)
            """),
            {"name": name},
        )
