from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, JSON
from .db import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)               # admin | mentor | student
    status = Column(String, default="active")           # pending | accepted | active | inactive | revoked
    must_reset_pw = Column(Boolean, default=False)
    # invitation lifecycle
    invitation_token = Column(String, nullable=True, index=True)
    invited_at = Column(DateTime, nullable=True)
    accepted_at = Column(DateTime, nullable=True)
    phone = Column(String, nullable=True)
    # student identity / placement
    college_id = Column(String, nullable=True)           # roll / college ID
    program = Column(String, nullable=True)              # PGDM / MBA ...
    batch = Column(String, nullable=True)                # e.g. 2024-26
    # faculty identity / professional
    employee_id = Column(String, nullable=True)
    designation = Column(String, nullable=True)
    qualification = Column(String, nullable=True)
    experience = Column(String, nullable=True)
    # NOTE: a user's department(s) are the Subjects they are mapped to
    # (MentorSubject / StudentSubject) — there is no free-text department field.
    extra = Column(JSON, nullable=True, default=dict)    # values for registered CustomUserFields
    created_at = Column(DateTime, default=datetime.utcnow)


class CustomUserField(Base):
    """Additional user attributes discovered during bulk import — registered system-wide
    so they surface as columns in User Management and can be reused on later imports."""
    __tablename__ = "custom_user_fields"
    id = Column(Integer, primary_key=True)
    key = Column(String, unique=True, nullable=False)    # snake_case storage key inside User.extra
    label = Column(String, nullable=False)               # human label for display
    created_at = Column(DateTime, default=datetime.utcnow)


class Subject(Base):
    """A department / specialization (Finance, Marketing, HR, Operations).
    Students and mentors are mapped to these; each can have a Head of Department."""
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    status = Column(String, default="active")
    head_id = Column(Integer, ForeignKey("users.id"), nullable=True)   # Head of Department (a faculty)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MentorSubject(Base):
    __tablename__ = "mentor_subjects"
    id = Column(Integer, primary_key=True)
    mentor_id = Column(Integer, ForeignKey("users.id"))
    subject_id = Column(Integer, ForeignKey("subjects.id"))


class StudentSubject(Base):
    __tablename__ = "student_subjects"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    current_level = Column(Integer, default=1)           # 1..5
    status = Column(String, default="in_progress")       # in_progress | completed | locked


class Capability(Base):
    __tablename__ = "capabilities"
    id = Column(Integer, primary_key=True)
    family = Column(String, nullable=False)              # Cognitive | Leadership | Entrepreneurial | Professional
    name = Column(String, nullable=False)
    status = Column(String, default="active")


class ScoringParameter(Base):
    __tablename__ = "scoring_parameters"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    weight = Column(Integer, default=0)                  # weights total 100
    capability_id = Column(Integer, ForeignKey("capabilities.id"), nullable=True)
    active = Column(Boolean, default=True)


class CaseStudy(Base):
    """A scenario/assessment authored by a mentor. Admin oversees all of them."""
    __tablename__ = "case_studies"
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    scenario = Column(String, nullable=True)             # the brief shown to students
    subject_id = Column(Integer, ForeignKey("subjects.id"))      # department
    author_id = Column(Integer, ForeignKey("users.id"))          # mentor
    level = Column(Integer, default=1)                   # difficulty 1..5
    status = Column(String, default="active")            # active | inactive | draft
    launch_mode = Column(String, default="open")         # open | fixed_window
    reading_time_sec = Column(Integer, default=300)
    attempt_time_sec = Column(Integer, default=1800)
    launch_at = Column(DateTime, nullable=True)          # launch date/time
    close_at = Column(DateTime, nullable=True)           # for fixed_window
    pass_mark = Column(Integer, default=75)
    disqualify_threshold = Column(Integer, default=70)   # % of completion required in time
    assigned_count = Column(Integer, default=0)          # students it was assigned to
    attachment_name = Column(String, nullable=True)      # uploaded brief filename (optional)
    attachment_data = Column(String, nullable=True)      # base64 of the uploaded brief
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CaseStudyCapability(Base):
    __tablename__ = "case_study_capabilities"
    id = Column(Integer, primary_key=True)
    case_study_id = Column(Integer, ForeignKey("case_studies.id"))
    capability_id = Column(Integer, ForeignKey("capabilities.id"))


class CaseStudyQuestion(Base):
    """A question within a case study — students answer each one; AI assesses per question."""
    __tablename__ = "case_study_questions"
    id = Column(Integer, primary_key=True)
    case_study_id = Column(Integer, ForeignKey("case_studies.id"), index=True)
    order = Column(Integer, default=0)
    text = Column(String, nullable=False)


class CaseStudyAttempt(Base):
    """One student's run at a case study — the source of all module analytics."""
    __tablename__ = "case_study_attempts"
    id = Column(Integer, primary_key=True)
    case_study_id = Column(Integer, ForeignKey("case_studies.id"), index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=True)   # null for seeded demo rows
    student_name = Column(String, nullable=True)         # denormalised for display
    department = Column(String, nullable=True)
    status = Column(String, default="in_progress")       # in_progress | submitted | completed | disqualified
    score = Column(Integer, nullable=True)               # 0..100, null while in_progress
    capability_scores = Column(JSON, nullable=True)      # {capability_name: score}
    time_taken_sec = Column(Integer, nullable=True)
    revise_used = Column(Boolean, default=False)
    answer_text = Column(String, nullable=True)          # overall solution (legacy / fallback)
    question_answers = Column(JSON, nullable=True)       # [{q, a, assessment}] per case-study question
    ai_report = Column(JSON, nullable=True)              # AI report card: summary/strengths/rapid_fire/suggestions
    started_at = Column(DateTime, default=datetime.utcnow)
    submitted_at = Column(DateTime, nullable=True)
