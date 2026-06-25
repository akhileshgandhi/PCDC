from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


# ---- auth ----
class LoginIn(BaseModel):
    email: str
    password: str


class SetPwIn(BaseModel):
    email: str
    temp_password: str
    new_password: str


class UpdateMeIn(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None


class ChangePwIn(BaseModel):
    current_password: str
    new_password: str


class AssignDeptIn(BaseModel):
    subject_id: int


class UserOut(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    status: str
    phone: Optional[str] = None
    # student
    college_id: Optional[str] = None
    program: Optional[str] = None
    batch: Optional[str] = None
    # faculty
    employee_id: Optional[str] = None
    designation: Optional[str] = None
    qualification: Optional[str] = None
    experience: Optional[str] = None
    # department mapping (Subject names the user belongs to)
    departments: List[str] = []
    # invitation lifecycle
    invited_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    extra: Optional[dict] = None
    model_config = {"from_attributes": True}


class InviteLinkOut(BaseModel):
    invite_link: str


class InvitationInfoOut(BaseModel):
    email: str
    full_name: str
    role: str
    org: str = "PCDC"


class InvitationAcceptIn(BaseModel):
    token: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---- master data ----
class SubjectIn(BaseModel):
    name: str


class SubjectUpdateIn(BaseModel):
    name: Optional[str] = None
    head_id: Optional[int] = None          # set to 0/None to clear the head
    status: Optional[str] = None


class SubjectImportRow(BaseModel):
    name: str
    status: Optional[str] = "active"


class SubjectOut(BaseModel):
    id: int
    name: str
    status: str
    head_id: Optional[int] = None
    head_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class CapabilityIn(BaseModel):
    family: str
    name: str


class CapabilityUpdateIn(BaseModel):
    family: Optional[str] = None
    name: Optional[str] = None
    status: Optional[str] = None


class CapabilityOut(BaseModel):
    id: int
    family: str
    name: str
    model_config = {"from_attributes": True}


class ScoringParamIn(BaseModel):
    id: Optional[int] = None
    name: str
    weight: int
    capability_id: Optional[int] = None
    active: bool = True


class ScoringParamOut(BaseModel):
    id: int
    name: str
    weight: int
    capability_id: Optional[int] = None
    active: bool
    model_config = {"from_attributes": True}


# ---- users ----
class MentorInviteIn(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    employee_id: Optional[str] = None
    designation: Optional[str] = None
    qualification: Optional[str] = None
    experience: Optional[str] = None
    subject_ids: List[int] = []          # departments the mentor is mapped to


class StudentInviteIn(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    college_id: Optional[str] = None
    program: Optional[str] = None
    batch: Optional[str] = None
    subject_id: int                       # department / specialization


class UserUpdateIn(BaseModel):
    """Edit / activate-deactivate a mentor or student. Only provided fields change."""
    full_name: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None          # active | invited | inactive
    # student
    college_id: Optional[str] = None
    program: Optional[str] = None
    batch: Optional[str] = None
    # faculty
    employee_id: Optional[str] = None
    designation: Optional[str] = None
    qualification: Optional[str] = None
    experience: Optional[str] = None
    # department mapping (replaces existing when provided)
    subject_ids: Optional[List[int]] = None


class StudentImportRow(BaseModel):
    full_name: str
    email: str
    college_id: Optional[str] = None
    subject: str


# ---- bulk import (any-format Excel/CSV with field mapping) ----
class CustomFieldIn(BaseModel):
    key: str
    label: str


class CustomFieldOut(BaseModel):
    id: int
    key: str
    label: str
    model_config = {"from_attributes": True}


class ImportRecord(BaseModel):
    full_name: str
    email: str
    role: Optional[str] = None                 # per-row override of the batch role
    phone: Optional[str] = None
    college_id: Optional[str] = None
    program: Optional[str] = None
    batch: Optional[str] = None
    employee_id: Optional[str] = None
    designation: Optional[str] = None
    qualification: Optional[str] = None
    experience: Optional[str] = None
    subject: Optional[str] = None              # department, matched against the subjects master list
    extra: dict = {}                           # custom-field values, keyed by CustomUserField.key


class BulkImportIn(BaseModel):
    role: str = "student"                      # default role applied to rows without one
    records: List[ImportRecord]
    custom_fields: List[CustomFieldIn] = []    # custom columns to register/ensure exist


# ---- case studies (admin oversight) ----
class CaseStudyOut(BaseModel):
    id: int
    title: str
    department: Optional[str] = None
    subject_id: Optional[int] = None
    author: Optional[str] = None
    level: int
    status: str
    launch_mode: str
    launch_at: Optional[datetime] = None
    close_at: Optional[datetime] = None
    reading_time_sec: int
    attempt_time_sec: int
    capabilities: List[str] = []
    # aggregates
    assigned: int = 0
    attempts: int = 0
    answered: int = 0
    completed: int = 0
    disqualified: int = 0
    avg_score: Optional[float] = None
    pass_rate: Optional[float] = None


class AnswerItem(BaseModel):
    q: str
    a: str = ""


class StartAttemptIn(BaseModel):
    case_study_id: int


class RapidFireIn(BaseModel):
    case_study_id: int
    answers: List[AnswerItem] = []


class SuggestionsIn(BaseModel):
    case_study_id: int
    answers: List[AnswerItem] = []
    rapidfire: List[AnswerItem] = []


class FinalizeIn(BaseModel):
    attempt_id: int
    answers: List[AnswerItem] = []
    rapidfire: List[AnswerItem] = []
    revised: bool = False


class AttemptOut(BaseModel):
    id: int
    student_name: Optional[str] = None
    department: Optional[str] = None
    status: str
    score: Optional[int] = None
    time_taken_sec: Optional[int] = None
    revise_used: bool = False
    submitted_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class CaseStudyCreateIn(BaseModel):
    title: str
    scenario: Optional[str] = None
    subject_id: int
    level: int = 1
    launch_mode: str = "open"                  # open | fixed_window
    reading_time_sec: int = 300
    attempt_time_sec: int = 1800
    launch_at: Optional[datetime] = None
    close_at: Optional[datetime] = None
    pass_mark: int = 75
    disqualify_threshold: int = 70
    capability_ids: List[int] = []
    questions: List[str] = []                  # the questions students answer
    attachment_name: Optional[str] = None
    attachment_data: Optional[str] = None      # base64 of an uploaded brief
    status: str = "draft"                      # draft | active


class CaseStudyUpdateIn(BaseModel):
    title: Optional[str] = None
    scenario: Optional[str] = None
    subject_id: Optional[int] = None
    level: Optional[int] = None
    launch_mode: Optional[str] = None
    reading_time_sec: Optional[int] = None
    attempt_time_sec: Optional[int] = None
    launch_at: Optional[datetime] = None
    close_at: Optional[datetime] = None
    pass_mark: Optional[int] = None
    disqualify_threshold: Optional[int] = None
    capability_ids: Optional[List[int]] = None
    questions: Optional[List[str]] = None
    attachment_name: Optional[str] = None
    attachment_data: Optional[str] = None
    status: Optional[str] = None               # draft | active | inactive
