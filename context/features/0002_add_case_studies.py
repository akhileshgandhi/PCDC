"""
Migration: 0002_add_case_studies
Description: Adds case studies system including tags, attempts,
             evaluations, and AI conversation logging.
Created: 2026-06-25

Run this migration:
    alembic upgrade head

Rollback:
    alembic downgrade -1
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import TEXT

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():

    # -------------------------------------------------------
    # TABLE: case_studies
    # Core table. One row per case study.
    # source: 'faculty' | 'mentor' | 'ai_generated' | 'admin_import'
    # status: 'draft' | 'published' | 'archived'
    # -------------------------------------------------------
    op.create_table(
        "case_studies",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),          # full case body
        sa.Column("domain", sa.String(100), nullable=False),      # geopolitics | sports | business | social | science | technology
        sa.Column("difficulty", sa.Integer(), nullable=False),    # 1-7 matching level system
        sa.Column("estimated_minutes", sa.Integer(), default=45), # expected completion time
        sa.Column(
            "source",
            sa.String(50),
            nullable=False,
            default="faculty",
        ),                                                         # faculty | mentor | ai_generated | admin_import
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            default="draft",
        ),                                                         # draft | published | archived
        sa.Column(
            "created_by",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("evaluation_rubric", sa.Text(), nullable=True), # JSON string: custom scoring criteria
        sa.Column("learning_outcomes", sa.Text(), nullable=True), # what student should learn
        sa.Column("reflection_questions", sa.Text(), nullable=True), # post-attempt reflection prompts
        sa.Column(
            "created_at",
            sa.TIMESTAMP(),
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(),
            server_default=sa.text("NOW()"),
            onupdate=sa.text("NOW()"),
        ),
    )

    # Indexes for case_studies
    op.create_index("idx_case_studies_domain", "case_studies", ["domain"])
    op.create_index("idx_case_studies_difficulty", "case_studies", ["difficulty"])
    op.create_index("idx_case_studies_status", "case_studies", ["status"])
    op.create_index("idx_case_studies_source", "case_studies", ["source"])
    op.create_index("idx_case_studies_created_by", "case_studies", ["created_by"])


    # -------------------------------------------------------
    # TABLE: case_study_tags
    # Flexible multi-dimensional tagging system.
    # tag_type: 'domain' | 'career_track' | 'capability'
    # Examples:
    #   domain      → geopolitics, sports, business, social
    #   career_track → consulting, finance, marketing, hr
    #   capability  → strategic_thinking, decision_making
    # One case study can have many tags across all three types.
    # -------------------------------------------------------
    op.create_table(
        "case_study_tags",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "case_study_id",
            sa.Integer(),
            sa.ForeignKey("case_studies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("tag_type", sa.String(50), nullable=False),
        sa.Column("tag_value", sa.String(100), nullable=False),
    )

    op.create_index(
        "idx_case_study_tags_case_id", "case_study_tags", ["case_study_id"]
    )
    op.create_index(
        "idx_case_study_tags_type_value",
        "case_study_tags",
        ["tag_type", "tag_value"],
    )
    # Prevent duplicate tags on the same case study
    op.create_unique_constraint(
        "uq_case_study_tag",
        "case_study_tags",
        ["case_study_id", "tag_type", "tag_value"],
    )


    # -------------------------------------------------------
    # TABLE: case_study_attempts
    # One row per student per case study.
    # UNIQUE constraint enforces one-attempt-only rule at DB level.
    # status: 'analysis_submitted' | 'ai_discussion' | 'solution_submitted' | 'defense_complete' | 'evaluated'
    # -------------------------------------------------------
    op.create_table(
        "case_study_attempts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "case_study_id",
            sa.Integer(),
            sa.ForeignKey("case_studies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "student_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("initial_analysis", sa.Text(), nullable=True),  # think-first submission
        sa.Column("initial_word_count", sa.Integer(), default=0),
        sa.Column("final_solution", sa.Text(), nullable=True),    # solution after AI discussion
        sa.Column("defense_responses", sa.Text(), nullable=True), # responses to AI defense questions
        sa.Column("reflection_text", sa.Text(), nullable=True),   # post-AI reflection
        sa.Column(
            "status",
            sa.String(50),
            nullable=False,
            default="analysis_submitted",
        ),
        sa.Column("start_time", sa.TIMESTAMP(), server_default=sa.text("NOW()")),
        sa.Column("end_time", sa.TIMESTAMP(), nullable=True),
        sa.Column("time_taken_minutes", sa.Integer(), nullable=True),
        sa.Column("ai_unlocked_at", sa.TIMESTAMP(), nullable=True), # when AI access was granted
    )

    # CRITICAL: enforces one attempt per student per case study
    op.create_unique_constraint(
        "uq_one_attempt_per_student",
        "case_study_attempts",
        ["case_study_id", "student_id"],
    )
    op.create_index(
        "idx_attempts_student_id", "case_study_attempts", ["student_id"]
    )
    op.create_index(
        "idx_attempts_case_study_id", "case_study_attempts", ["case_study_id"]
    )
    op.create_index(
        "idx_attempts_status", "case_study_attempts", ["status"]
    )


    # -------------------------------------------------------
    # TABLE: cs_evaluations
    # AI-generated evaluation scores after attempt completion.
    # Weights match spec: 30/20/15/15/10/10
    # -------------------------------------------------------
    op.create_table(
        "cs_evaluations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "attempt_id",
            sa.Integer(),
            sa.ForeignKey("case_study_attempts.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,  # one evaluation per attempt
        ),
        # Core scoring dimensions (each 0-100)
        sa.Column("thinking_depth", sa.Integer(), nullable=True),   # 30% weight
        sa.Column("logic_score", sa.Integer(), nullable=True),      # 20% weight
        sa.Column("creativity_score", sa.Integer(), nullable=True), # 15% weight
        sa.Column("practicality_score", sa.Integer(), nullable=True), # 15% weight
        sa.Column("risk_awareness_score", sa.Integer(), nullable=True), # 10% weight
        sa.Column("reflection_score", sa.Integer(), nullable=True), # 10% weight
        # Computed weighted total
        sa.Column("total_score", sa.Integer(), nullable=True),
        # Time efficiency bonus/penalty
        sa.Column("time_score", sa.Integer(), nullable=True),
        # AI usage quality — did student use AI intelligently?
        sa.Column("ai_utilization_score", sa.Integer(), nullable=True),
        # Qualitative feedback generated by AI
        sa.Column("strengths", sa.Text(), nullable=True),
        sa.Column("weaknesses", sa.Text(), nullable=True),
        sa.Column("blind_spots", sa.Text(), nullable=True),
        sa.Column("improvement_areas", sa.Text(), nullable=True),
        sa.Column("next_recommended_case_id", sa.Integer(), nullable=True),
        sa.Column(
            "evaluated_at",
            sa.TIMESTAMP(),
            server_default=sa.text("NOW()"),
        ),
    )

    op.create_index(
        "idx_evaluations_attempt_id", "cs_evaluations", ["attempt_id"]
    )


    # -------------------------------------------------------
    # TABLE: cs_ai_conversations
    # Full conversation log between student and AI during attempt.
    # Mentor can replay this to see student thinking path.
    # role: 'student' | 'ai'
    # stage: 'analysis' | 'discussion' | 'defense' | 'reflection'
    # -------------------------------------------------------
    op.create_table(
        "cs_ai_conversations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "attempt_id",
            sa.Integer(),
            sa.ForeignKey("case_study_attempts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", sa.String(20), nullable=False),   # student | ai
        sa.Column("stage", sa.String(30), nullable=False),  # analysis | discussion | defense | reflection
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("prompt_tokens", sa.Integer(), nullable=True),   # track API cost
        sa.Column("response_tokens", sa.Integer(), nullable=True),
        sa.Column(
            "timestamp",
            sa.TIMESTAMP(),
            server_default=sa.text("NOW()"),
        ),
    )

    op.create_index(
        "idx_cs_conversations_attempt_id",
        "cs_ai_conversations",
        ["attempt_id"],
    )
    op.create_index(
        "idx_cs_conversations_stage",
        "cs_ai_conversations",
        ["attempt_id", "stage"],
    )


    # -------------------------------------------------------
    # SEED DATA: default domain tags reference values
    # These are just comments — actual seed data goes in
    # a separate seed script or via the admin import tool.
    #
    # Domains: geopolitics, sports, business, social,
    #          science, technology, environment, healthcare
    #
    # Career tracks (must match career_tracks table):
    #   consulting, finance, marketing, hr, operations,
    #   entrepreneurship, family_business, analytics,
    #   sales_leadership, general_management
    # -------------------------------------------------------


def downgrade():
    # Drop in reverse order to respect foreign key constraints
    op.drop_table("cs_ai_conversations")
    op.drop_table("cs_evaluations")
    op.drop_table("case_study_attempts")
    op.drop_table("case_study_tags")
    op.drop_table("case_studies")
