from collections import defaultdict
from datetime import datetime, timedelta
from statistics import mean, median
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import (CaseStudy, CaseStudyCapability, CaseStudyAttempt, CaseStudyQuestion,
                      Subject, User, Capability, MentorSubject)
from ..schemas import CaseStudyOut, AttemptOut, CaseStudyCreateIn, CaseStudyUpdateIn
from ..security import require_role

router = APIRouter(prefix="/api/case-studies", tags=["case-studies"])
admin_or_mentor = require_role("admin", "mentor")
admin_only = require_role("admin")

ANSWERED = ("submitted", "completed", "disqualified")


def _mentor_subject_ids(db: Session, user: User) -> list[int]:
    return [r[0] for r in db.query(MentorSubject.subject_id).filter(MentorSubject.mentor_id == user.id).all()]


def _can_edit(c: CaseStudy, user: User) -> bool:
    return user.role == "admin" or c.author_id == user.id


def _set_capabilities(db: Session, cid: int, capability_ids: list[int]):
    db.query(CaseStudyCapability).filter(CaseStudyCapability.case_study_id == cid).delete()
    for cap_id in capability_ids:
        if db.get(Capability, cap_id):
            db.add(CaseStudyCapability(case_study_id=cid, capability_id=cap_id))


def _set_questions(db: Session, cid: int, questions: list[str]):
    db.query(CaseStudyQuestion).filter(CaseStudyQuestion.case_study_id == cid).delete()
    for i, q in enumerate(questions):
        if q and q.strip():
            db.add(CaseStudyQuestion(case_study_id=cid, order=i, text=q.strip()))


def _questions(db: Session, cid: int) -> list[str]:
    return [q.text for q in db.query(CaseStudyQuestion).filter(CaseStudyQuestion.case_study_id == cid).order_by(CaseStudyQuestion.order).all()]


def _one_out(db: Session, c: CaseStudy) -> CaseStudyOut:
    subj, auth, caps = _names(db)
    agg = _agg(db.query(CaseStudyAttempt).filter(CaseStudyAttempt.case_study_id == c.id).all())
    return CaseStudyOut(
        id=c.id, title=c.title, department=subj.get(c.subject_id), subject_id=c.subject_id,
        author=auth.get(c.author_id), level=c.level, status=c.status, launch_mode=c.launch_mode,
        launch_at=c.launch_at, close_at=c.close_at, reading_time_sec=c.reading_time_sec,
        attempt_time_sec=c.attempt_time_sec, capabilities=caps.get(c.id, []), assigned=c.assigned_count, **agg)


def _names(db: Session):
    subj = {s.id: s.name for s in db.query(Subject).all()}
    auth = {u.id: u.full_name for u in db.query(User).all()}
    caps = defaultdict(list)
    for link, cap in db.query(CaseStudyCapability, Capability).join(Capability, Capability.id == CaseStudyCapability.capability_id).all():
        caps[link.case_study_id].append(cap.name)
    return subj, auth, caps


def _agg(attempts: list[CaseStudyAttempt]) -> dict:
    answered = [a for a in attempts if a.status in ANSWERED]
    scored = [a.score for a in answered if a.score is not None]
    passed = [s for s in scored if s >= 75]
    return {
        "attempts": len(attempts),
        "answered": len(answered),
        "completed": sum(1 for a in attempts if a.status == "completed"),
        "disqualified": sum(1 for a in attempts if a.status == "disqualified"),
        "avg_score": round(mean(scored), 1) if scored else None,
        "pass_rate": round(100 * len(passed) / len(answered), 1) if answered else None,
    }


def _by_case(db: Session) -> dict[int, list[CaseStudyAttempt]]:
    out: dict[int, list[CaseStudyAttempt]] = defaultdict(list)
    for a in db.query(CaseStudyAttempt).all():
        out[a.case_study_id].append(a)
    return out


@router.get("", response_model=list[CaseStudyOut])
def list_case_studies(subject_id: int | None = None, level: int | None = None,
                      status: str | None = None, author_id: int | None = None,
                      days: int | None = None, q: str | None = None,
                      db: Session = Depends(get_db), me: User = Depends(admin_or_mentor)):
    subj, auth, caps = _names(db)
    by_case = _by_case(db)
    query = db.query(CaseStudy)
    if me.role == "mentor":
        query = query.filter(CaseStudy.author_id == me.id)   # a mentor only sees their own
    if subject_id:
        query = query.filter(CaseStudy.subject_id == subject_id)
    if level:
        query = query.filter(CaseStudy.level == level)
    if status:
        query = query.filter(CaseStudy.status == status)
    if author_id:
        query = query.filter(CaseStudy.author_id == author_id)
    if days:
        query = query.filter(CaseStudy.launch_at >= datetime.utcnow() - timedelta(days=days))
    rows = query.order_by(CaseStudy.launch_at.desc().nullslast()).all()
    out = []
    for c in rows:
        if q and q.strip().lower() not in c.title.lower():
            continue
        agg = _agg(by_case.get(c.id, []))
        out.append(CaseStudyOut(
            id=c.id, title=c.title, department=subj.get(c.subject_id), subject_id=c.subject_id,
            author=auth.get(c.author_id), level=c.level, status=c.status, launch_mode=c.launch_mode,
            launch_at=c.launch_at, close_at=c.close_at, reading_time_sec=c.reading_time_sec,
            attempt_time_sec=c.attempt_time_sec, capabilities=caps.get(c.id, []),
            assigned=c.assigned_count, **agg))
    return out


@router.get("/meta")
def form_meta(db: Session = Depends(get_db), me: User = Depends(admin_or_mentor)):
    """Departments (scoped to a mentor's own) + capabilities, for the authoring form."""
    if me.role == "mentor":
        ids = set(_mentor_subject_ids(db, me))
        depts = [s for s in db.query(Subject).order_by(Subject.name).all() if s.id in ids]
    else:
        depts = db.query(Subject).order_by(Subject.name).all()
    caps = db.query(Capability).order_by(Capability.family, Capability.name).all()
    return {
        "departments": [{"id": s.id, "name": s.name} for s in depts],
        "capabilities": [{"id": c.id, "family": c.family, "name": c.name} for c in caps],
    }


@router.get("/analytics")
def module_analytics(db: Session = Depends(get_db), me: User = Depends(admin_or_mentor)):
    subj, _auth, _caps = _names(db)
    cases = db.query(CaseStudy).all()
    attempts = db.query(CaseStudyAttempt).all()
    if me.role == "mentor":
        mine = {c.id for c in cases if c.author_id == me.id}
        cases = [c for c in cases if c.id in mine]
        attempts = [a for a in attempts if a.case_study_id in mine]
    answered = [a for a in attempts if a.status in ANSWERED]
    scored = [a.score for a in answered if a.score is not None]

    by_dept = defaultdict(int)
    by_level = defaultdict(int)
    for c in cases:
        by_dept[subj.get(c.subject_id, "—")] += 1
        by_level[c.level] += 1

    # score bands across all answered attempts
    bands = {"Rejected (<70)": 0, "Incomplete (70-74)": 0, "Pass (>=75)": 0}
    for s in scored:
        if s < 70:
            bands["Rejected (<70)"] += 1
        elif s < 75:
            bands["Incomplete (70-74)"] += 1
        else:
            bands["Pass (>=75)"] += 1

    # attempts over time (by submission date)
    over_time = defaultdict(int)
    for a in answered:
        if a.submitted_at:
            over_time[a.submitted_at.strftime("%Y-%m-%d")] += 1

    # per-case aggregates for leaderboards
    by_case = _by_case(db)
    per_case = []
    for c in cases:
        agg = _agg(by_case.get(c.id, []))
        per_case.append({"id": c.id, "title": c.title, "department": subj.get(c.subject_id),
                         "level": c.level, "attempts": agg["attempts"], "avg_score": agg["avg_score"]})
    ranked = [p for p in per_case if p["attempts"] > 0]

    unique_students = len({a.student_id or a.student_name for a in attempts})
    return {
        "totals": {
            "case_studies": len(cases),
            "active": sum(1 for c in cases if c.status == "active"),
            "inactive": sum(1 for c in cases if c.status != "active"),
            "attempts": len(attempts),
            "answered": len(answered),
            "unique_students": unique_students,
            "avg_score": round(mean(scored), 1) if scored else None,
            "pass_rate": round(100 * sum(1 for s in scored if s >= 75) / len(answered), 1) if answered else None,
            "disqualification_rate": round(100 * sum(1 for a in answered if a.status == "disqualified") / len(answered), 1) if answered else None,
        },
        "by_department": [{"label": k, "value": v} for k, v in sorted(by_dept.items())],
        "by_level": [{"label": f"Level {k}", "value": by_level[k]} for k in sorted(by_level)],
        "score_bands": [{"label": k, "value": v} for k, v in bands.items()],
        "attempts_over_time": [{"label": k, "value": over_time[k]} for k in sorted(over_time)],
        "most_attempted": sorted(ranked, key=lambda p: -p["attempts"])[:5],
        "hardest": sorted(ranked, key=lambda p: (p["avg_score"] is None, p["avg_score"]))[:5],
    }


@router.post("", response_model=CaseStudyOut, status_code=201)
def create_case_study(body: CaseStudyCreateIn, db: Session = Depends(get_db), me: User = Depends(admin_or_mentor)):
    if not db.get(Subject, body.subject_id):
        raise HTTPException(400, "Unknown department")
    if me.role == "mentor" and body.subject_id not in _mentor_subject_ids(db, me):
        raise HTTPException(403, "You can only author case studies in your own departments")
    if body.status not in ("draft", "active"):
        raise HTTPException(400, "status must be draft or active")
    launch = body.launch_at or datetime.utcnow()
    c = CaseStudy(
        title=body.title.strip(), scenario=body.scenario, subject_id=body.subject_id, author_id=me.id,
        level=body.level, status=body.status, launch_mode=body.launch_mode,
        reading_time_sec=body.reading_time_sec, attempt_time_sec=body.attempt_time_sec,
        launch_at=launch,
        close_at=body.close_at or (launch + timedelta(days=14)),   # always a launch→close range
        pass_mark=body.pass_mark, disqualify_threshold=body.disqualify_threshold, assigned_count=0,
        attachment_name=body.attachment_name, attachment_data=body.attachment_data)
    db.add(c); db.flush()
    _set_capabilities(db, c.id, body.capability_ids)
    _set_questions(db, c.id, body.questions)
    db.commit(); db.refresh(c)
    return _one_out(db, c)


@router.get("/{cid}")
def case_study_detail(cid: int, db: Session = Depends(get_db), me: User = Depends(admin_or_mentor)):
    c = db.get(CaseStudy, cid)
    if not c:
        raise HTTPException(404, "Case study not found")
    if me.role == "mentor" and c.author_id != me.id:
        raise HTTPException(403, "Not your case study")
    subj, auth, caps = _names(db)
    attempts = db.query(CaseStudyAttempt).filter(CaseStudyAttempt.case_study_id == cid).all()
    answered = [a for a in attempts if a.status in ANSWERED]
    scored = [a.score for a in answered if a.score is not None]
    agg = _agg(attempts)

    # participation funnel
    started = len(attempts)
    funnel = {
        "assigned": c.assigned_count,
        "started": started,
        "submitted": sum(1 for a in attempts if a.status in ("submitted", "completed", "disqualified")),
        "completed": sum(1 for a in attempts if a.status == "completed"),
        "disqualified": sum(1 for a in attempts if a.status == "disqualified"),
    }
    # score distribution buckets of 10
    dist = {f"{b}-{b+9}": 0 for b in range(0, 100, 10)}
    for s in scored:
        b = min(s // 10 * 10, 90)
        dist[f"{b}-{b+9}"] += 1
    # per-capability averages
    cap_acc = defaultdict(list)
    for a in answered:
        for k, v in (a.capability_scores or {}).items():
            cap_acc[k].append(v)
    per_cap = [{"label": k, "value": round(mean(v), 1)} for k, v in sorted(cap_acc.items())]
    times = [a.time_taken_sec for a in answered if a.time_taken_sec]

    return {
        "id": c.id, "title": c.title, "scenario": c.scenario, "department": subj.get(c.subject_id),
        "author": auth.get(c.author_id), "level": c.level, "status": c.status,
        "launch_mode": c.launch_mode, "launch_at": c.launch_at.isoformat() if c.launch_at else None,
        "close_at": c.close_at.isoformat() if c.close_at else None,
        "reading_time_sec": c.reading_time_sec, "attempt_time_sec": c.attempt_time_sec,
        "pass_mark": c.pass_mark, "disqualify_threshold": c.disqualify_threshold,
        "capabilities": caps.get(c.id, []),
        "capability_ids": [r[0] for r in db.query(CaseStudyCapability.capability_id).filter(CaseStudyCapability.case_study_id == c.id).all()],
        "questions": _questions(db, c.id),
        "attachment_name": c.attachment_name,
        "stats": {
            **agg,
            "median_score": round(median(scored), 1) if scored else None,
            "max_score": max(scored) if scored else None,
            "min_score": min(scored) if scored else None,
            "avg_time_sec": round(mean(times)) if times else None,
            "disqualification_rate": round(100 * funnel["disqualified"] / len(answered), 1) if answered else None,
        },
        "funnel": funnel,
        "score_distribution": [{"label": k, "value": dist[k]} for k in dist],
        "per_capability": per_cap,
    }


@router.get("/{cid}/attempts", response_model=list[AttemptOut])
def case_study_attempts(cid: int, db: Session = Depends(get_db), me: User = Depends(admin_or_mentor)):
    c = db.get(CaseStudy, cid)
    if not c:
        raise HTTPException(404, "Case study not found")
    if me.role == "mentor" and c.author_id != me.id:
        raise HTTPException(403, "Not your case study")
    return (db.query(CaseStudyAttempt).filter(CaseStudyAttempt.case_study_id == cid)
            .order_by(CaseStudyAttempt.score.desc().nullslast()).all())


@router.get("/{cid}/attempts/{aid}")
def attempt_detail(cid: int, aid: int, db: Session = Depends(get_db), me: User = Depends(admin_or_mentor)):
    c = db.get(CaseStudy, cid)
    if not c:
        raise HTTPException(404, "Case study not found")
    if me.role == "mentor" and c.author_id != me.id:
        raise HTTPException(403, "Not your case study")
    a = db.get(CaseStudyAttempt, aid)
    if not a or a.case_study_id != cid:
        raise HTTPException(404, "Submission not found")
    _subj, _auth, caps = _names(db)
    return {
        "id": a.id, "student_name": a.student_name, "department": a.department, "status": a.status,
        "score": a.score, "time_taken_sec": a.time_taken_sec, "revise_used": a.revise_used,
        "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
        "capability_scores": a.capability_scores or {}, "answer_text": a.answer_text,
        "question_answers": a.question_answers or [], "ai_report": a.ai_report or {}, "pass_mark": c.pass_mark,
        "case_title": c.title, "capabilities": caps.get(c.id, []),
    }


@router.get("/{cid}/attachment")
def case_study_attachment(cid: int, db: Session = Depends(get_db), me: User = Depends(admin_or_mentor)):
    c = db.get(CaseStudy, cid)
    if not c:
        raise HTTPException(404, "Case study not found")
    if me.role == "mentor" and c.author_id != me.id:
        raise HTTPException(403, "Not your case study")
    if not c.attachment_data:
        raise HTTPException(404, "No attachment")
    return {"name": c.attachment_name, "data": c.attachment_data}


@router.patch("/{cid}", response_model=CaseStudyOut)
def update_case_study(cid: int, body: CaseStudyUpdateIn, db: Session = Depends(get_db), me: User = Depends(admin_or_mentor)):
    c = db.get(CaseStudy, cid)
    if not c:
        raise HTTPException(404, "Case study not found")
    if not _can_edit(c, me):
        raise HTTPException(403, "You can only edit your own case studies")
    if body.status is not None:
        if body.status not in ("active", "inactive", "draft"):
            raise HTTPException(400, "invalid status")
        c.status = body.status
    if body.subject_id is not None:
        if me.role == "mentor" and body.subject_id not in _mentor_subject_ids(db, me):
            raise HTTPException(403, "You can only use your own departments")
        c.subject_id = body.subject_id
    for fld in ("title", "scenario", "level", "launch_mode", "reading_time_sec",
                "attempt_time_sec", "launch_at", "close_at", "pass_mark", "disqualify_threshold"):
        val = getattr(body, fld)
        if val is not None:
            setattr(c, fld, val.strip() if isinstance(val, str) else val)
    if body.attachment_name is not None:
        c.attachment_name = body.attachment_name or None
        c.attachment_data = body.attachment_data or None
    if body.capability_ids is not None:
        _set_capabilities(db, c.id, body.capability_ids)
    if body.questions is not None:
        _set_questions(db, c.id, body.questions)
    db.commit(); db.refresh(c)
    return _one_out(db, c)


@router.delete("/{cid}", status_code=204)
def delete_case_study(cid: int, db: Session = Depends(get_db), me: User = Depends(admin_or_mentor)):
    c = db.get(CaseStudy, cid)
    if not c:
        raise HTTPException(404, "Case study not found")
    if not _can_edit(c, me):
        raise HTTPException(403, "You can only delete your own case studies")
    db.query(CaseStudyAttempt).filter(CaseStudyAttempt.case_study_id == cid).delete()
    db.query(CaseStudyCapability).filter(CaseStudyCapability.case_study_id == cid).delete()
    db.query(CaseStudyQuestion).filter(CaseStudyQuestion.case_study_id == cid).delete()
    db.delete(c); db.commit()
