from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import Subject, Capability, ScoringParameter, User
from ..schemas import (SubjectIn, SubjectOut, SubjectUpdateIn, SubjectImportRow, CapabilityIn, CapabilityOut,
                       CapabilityUpdateIn, ScoringParamIn, ScoringParamOut)
from ..security import require_role

router = APIRouter(prefix="/api", tags=["master-data"])
admin_only = require_role("admin")


# ---- Subjects (departments) ----
def _subject_out(s: Subject, db: Session) -> SubjectOut:
    head = db.get(User, s.head_id) if s.head_id else None
    return SubjectOut(id=s.id, name=s.name, status=s.status, head_id=s.head_id,
                      head_name=head.full_name if head else None,
                      created_at=s.created_at, updated_at=s.updated_at)


@router.get("/subjects", response_model=list[SubjectOut])
def list_subjects(db: Session = Depends(get_db), _: User = Depends(require_role("admin", "mentor"))):
    return [_subject_out(s, db) for s in db.query(Subject).order_by(Subject.id).all()]


@router.post("/subjects", response_model=SubjectOut, status_code=201)
def add_subject(body: SubjectIn, db: Session = Depends(get_db), _: User = Depends(admin_only)):
    if db.query(Subject).filter(Subject.name == body.name.strip()).first():
        raise HTTPException(409, "Department already exists")
    s = Subject(name=body.name.strip(), status="active")
    db.add(s); db.commit(); db.refresh(s)
    return _subject_out(s, db)


@router.patch("/subjects/{sid}", response_model=SubjectOut)
def update_subject(sid: int, body: SubjectUpdateIn, db: Session = Depends(get_db), _: User = Depends(admin_only)):
    s = db.get(Subject, sid)
    if not s:
        raise HTTPException(404, "Not found")
    if body.name is not None:
        s.name = body.name.strip()
    if body.status is not None:
        s.status = body.status
    if body.head_id is not None:
        if body.head_id == 0:
            s.head_id = None                       # clear the head
        else:
            head = db.get(User, body.head_id)
            if not head or head.role not in ("mentor", "admin"):
                raise HTTPException(400, "Head must be an existing faculty member")
            s.head_id = body.head_id
    db.commit(); db.refresh(s)
    return _subject_out(s, db)


@router.post("/subjects/import")
def import_subjects(rows: list[SubjectImportRow], db: Session = Depends(get_db), _: User = Depends(admin_only)):
    existing = {s.name.lower() for s in db.query(Subject).all()}
    created, skipped, errors, seen = 0, 0, [], set()
    for i, r in enumerate(rows):
        name = (r.name or "").strip()
        if not name:
            errors.append({"line": i + 1, "reason": "Missing name"}); continue
        key = name.lower()
        if key in existing or key in seen:
            skipped += 1; continue
        db.add(Subject(name=name, status=(r.status or "active").strip().lower() or "active"))
        seen.add(key); created += 1
    db.commit()
    return {"success": True, "data": {"created": created, "skipped": skipped, "errors": errors}}


@router.delete("/subjects/{sid}", status_code=204)
def delete_subject(sid: int, db: Session = Depends(get_db), _: User = Depends(admin_only)):
    s = db.get(Subject, sid)
    if not s:
        raise HTTPException(404, "Not found")
    db.delete(s); db.commit()


# ---- Capabilities ----
@router.get("/capabilities", response_model=list[CapabilityOut])
def list_capabilities(db: Session = Depends(get_db), _: User = Depends(require_role("admin", "mentor"))):
    return db.query(Capability).order_by(Capability.id).all()


@router.post("/capabilities", response_model=CapabilityOut, status_code=201)
def add_capability(body: CapabilityIn, db: Session = Depends(get_db), _: User = Depends(admin_only)):
    c = Capability(family=body.family.strip(), name=body.name.strip())
    db.add(c); db.commit(); db.refresh(c)
    return c


@router.patch("/capabilities/{cid}", response_model=CapabilityOut)
def update_capability(cid: int, body: CapabilityUpdateIn, db: Session = Depends(get_db), _: User = Depends(admin_only)):
    c = db.get(Capability, cid)
    if not c:
        raise HTTPException(404, "Not found")
    if body.family is not None:
        c.family = body.family.strip()
    if body.name is not None:
        c.name = body.name.strip()
    if body.status is not None:
        c.status = body.status
    db.commit(); db.refresh(c)
    return c


@router.delete("/capabilities/{cid}", status_code=204)
def delete_capability(cid: int, db: Session = Depends(get_db), _: User = Depends(admin_only)):
    c = db.get(Capability, cid)
    if not c:
        raise HTTPException(404, "Not found")
    db.delete(c); db.commit()


# ---- Scoring parameters (dynamic scheme) ----
@router.get("/scoring-parameters", response_model=list[ScoringParamOut])
def list_params(db: Session = Depends(get_db), _: User = Depends(require_role("admin", "mentor"))):
    return db.query(ScoringParameter).order_by(ScoringParameter.id).all()


@router.put("/scoring-parameters", response_model=list[ScoringParamOut])
def replace_params(body: list[ScoringParamIn], db: Session = Depends(get_db), _: User = Depends(admin_only)):
    total = sum(p.weight for p in body if p.active)
    if total != 100:
        raise HTTPException(400, f"Active weights must total 100 (got {total})")
    db.query(ScoringParameter).delete()
    for p in body:
        db.add(ScoringParameter(name=p.name, weight=p.weight,
                                capability_id=p.capability_id, active=p.active))
    db.commit()
    return db.query(ScoringParameter).order_by(ScoringParameter.id).all()
