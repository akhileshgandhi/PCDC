from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import (CaseStudy, CaseStudyCapability, CaseStudyAttempt, CaseStudyQuestion,
                      Subject, User, Capability, StudentSubject)
from ..schemas import StartAttemptIn, RapidFireIn, SuggestionsIn, FinalizeIn
from ..security import require_role
from .. import llm_stub

router = APIRouter(prefix="/api/student", tags=["student"])
student_only = require_role("student")


def _enrolment(db: Session, me: User) -> StudentSubject | None:
    return db.query(StudentSubject).filter(StudentSubject.student_id == me.id).first()


def _my_subject_ids(db: Session, me: User) -> list[int]:
    return [r[0] for r in db.query(StudentSubject.subject_id).filter(StudentSubject.student_id == me.id).all()]


def _caps(db: Session, cid: int) -> list[str]:
    rows = db.query(Capability.name).join(CaseStudyCapability, CaseStudyCapability.capability_id == Capability.id).filter(CaseStudyCapability.case_study_id == cid).all()
    return [r[0] for r in rows]


def _is_open(c: CaseStudy) -> bool:
    return c.status == "active" and (c.close_at is None or c.close_at > datetime.utcnow())


@router.get("/overview")
def overview(db: Session = Depends(get_db), me: User = Depends(student_only)):
    sids = _my_subject_ids(db, me)
    enr = _enrolment(db, me)
    dept = db.get(Subject, sids[0]).name if sids else None
    attempts = db.query(CaseStudyAttempt).filter(CaseStudyAttempt.student_id == me.id).all()
    done = [a for a in attempts if a.status in ("completed", "submitted", "disqualified")]
    scores = [a.score for a in done if a.score is not None]
    avail = [c for c in db.query(CaseStudy).filter(CaseStudy.subject_id.in_(sids or [-1])).all() if _is_open(c)]
    return {
        "name": me.full_name, "department": dept,
        "current_level": enr.current_level if enr else 1,
        "available": len(avail), "completed": len(done),
        "avg_score": round(sum(scores) / len(scores), 1) if scores else None,
        "best_score": max(scores) if scores else None,
    }


@router.get("/case-studies")
def my_case_studies(db: Session = Depends(get_db), me: User = Depends(student_only)):
    sids = _my_subject_ids(db, me)
    enr = _enrolment(db, me)
    level = enr.current_level if enr else 1
    subj = {s.id: s.name for s in db.query(Subject).all()}
    # latest attempt per case study for this student
    my_attempts: dict[int, CaseStudyAttempt] = {}
    for a in db.query(CaseStudyAttempt).filter(CaseStudyAttempt.student_id == me.id).order_by(CaseStudyAttempt.id).all():
        my_attempts[a.case_study_id] = a
    out = []
    for c in db.query(CaseStudy).filter(CaseStudy.subject_id.in_(sids or [-1])).order_by(CaseStudy.level, CaseStudy.id).all():
        if not _is_open(c):
            continue
        a = my_attempts.get(c.id)
        out.append({
            "id": c.id, "title": c.title, "department": subj.get(c.subject_id), "level": c.level,
            "reading_time_sec": c.reading_time_sec, "attempt_time_sec": c.attempt_time_sec,
            "close_at": c.close_at.isoformat() if c.close_at else None,
            "capabilities": _caps(db, c.id), "questions_count": db.query(CaseStudyQuestion).filter(CaseStudyQuestion.case_study_id == c.id).count(),
            "locked": c.level > level,                       # above the student's unlocked level
            "attempt_status": a.status if a else None, "attempt_score": a.score if a else None,
            "attempt_id": a.id if a else None,
        })
    return out


def _load_open(db: Session, me: User, cid: int) -> CaseStudy:
    c = db.get(CaseStudy, cid)
    if not c or c.subject_id not in _my_subject_ids(db, me):
        raise HTTPException(404, "Case study not available")
    if not _is_open(c):
        raise HTTPException(410, "This case study is closed — responses are no longer accepted")
    enr = _enrolment(db, me)
    if c.level > (enr.current_level if enr else 1):
        raise HTTPException(403, "Reach the required level to unlock this case study")
    return c


@router.post("/start")
def start(body: StartAttemptIn, db: Session = Depends(get_db), me: User = Depends(student_only)):
    c = _load_open(db, me, body.case_study_id)
    # one submission per student — no retakes once finished
    finished = db.query(CaseStudyAttempt).filter(
        CaseStudyAttempt.case_study_id == c.id, CaseStudyAttempt.student_id == me.id,
        CaseStudyAttempt.status.in_(("completed", "submitted", "disqualified"))).first()
    if finished:
        raise HTTPException(409, "You have already submitted this assessment")
    dept = db.get(Subject, c.subject_id)
    questions = [q.text for q in db.query(CaseStudyQuestion).filter(CaseStudyQuestion.case_study_id == c.id).order_by(CaseStudyQuestion.order).all()]
    # reuse an in-progress attempt or create a new one
    a = db.query(CaseStudyAttempt).filter(CaseStudyAttempt.case_study_id == c.id, CaseStudyAttempt.student_id == me.id, CaseStudyAttempt.status == "in_progress").first()
    if not a:
        a = CaseStudyAttempt(case_study_id=c.id, student_id=me.id, student_name=me.full_name,
                             department=dept.name if dept else None, status="in_progress", started_at=datetime.utcnow())
        db.add(a); db.commit(); db.refresh(a)
    return {
        "attempt_id": a.id, "title": c.title, "scenario": c.scenario,
        "questions": questions, "reading_time_sec": c.reading_time_sec,
        "attempt_time_sec": c.attempt_time_sec, "pass_mark": c.pass_mark,
        "attachment_name": c.attachment_name, "capabilities": _caps(db, c.id),
    }


@router.post("/rapidfire")
def rapidfire(body: RapidFireIn, db: Session = Depends(get_db), me: User = Depends(student_only)):
    c = _load_open(db, me, body.case_study_id)
    dept = db.get(Subject, c.subject_id)
    return {"questions": llm_stub.rapid_fire(dept.name if dept else "", [a.model_dump() for a in body.answers])}


@router.post("/suggestions")
def get_suggestions(body: SuggestionsIn, db: Session = Depends(get_db), me: User = Depends(student_only)):
    _load_open(db, me, body.case_study_id)
    return {"suggestions": llm_stub.suggestions([a.model_dump() for a in body.answers])}


@router.post("/finalize")
def finalize(body: FinalizeIn, db: Session = Depends(get_db), me: User = Depends(student_only)):
    a = db.get(CaseStudyAttempt, body.attempt_id)
    if not a or a.student_id != me.id:
        raise HTTPException(404, "Attempt not found")
    if a.status != "in_progress":
        raise HTTPException(400, "This attempt is already submitted")
    c = db.get(CaseStudy, a.case_study_id)
    caps = _caps(db, c.id)
    answers = [x.model_dump() for x in body.answers]
    rf = [x.model_dump() for x in body.rapidfire]
    ev = llm_stub.evaluate(a.department or "", c.title, caps, answers, rf, body.revised)

    a.score = ev["score"]
    a.capability_scores = ev["capability_scores"]
    a.question_answers = [{"q": x["q"], "a": x["a"]} for x in answers]
    a.ai_report = ev["report"]
    a.revise_used = body.revised
    a.status = "completed" if ev["score"] >= c.disqualify_threshold else "disqualified"
    a.submitted_at = datetime.utcnow()
    if a.started_at:
        a.time_taken_sec = int((a.submitted_at - a.started_at).total_seconds())

    # level progression
    progressed = False
    enr = _enrolment(db, me)
    if enr and ev["score"] >= c.pass_mark and c.level >= enr.current_level and enr.current_level < 5:
        enr.current_level = min(5, c.level + 1)
        progressed = True
    db.commit()

    msg = (f"Passed! You've advanced to Level {enr.current_level}." if progressed
           else "Passed." if ev["score"] >= c.pass_mark
           else "Below the pass mark — review the feedback and try the next attempt.")
    return {
        "score": ev["score"], "pass_mark": c.pass_mark, "result": ev["result"],
        "status": a.status, "capability_scores": ev["capability_scores"],
        "report": ev["report"], "answers": a.question_answers,
        "progression_message": msg, "passed": ev["score"] >= c.pass_mark,
    }
