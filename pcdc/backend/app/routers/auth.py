from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User
from ..schemas import LoginIn, SetPwIn, TokenOut, UserOut, InvitationInfoOut, InvitationAcceptIn, UpdateMeIn, ChangePwIn
from ..security import verify_pw, hash_pw, make_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

# statuses that are allowed to sign in
LOGIN_OK = ("active", "accepted")


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.email == body.email.strip().lower()).first()
    if not u or not verify_pw(body.password, u.password_hash):
        raise HTTPException(401, "Invalid email or password")
    if u.status in ("pending", "revoked"):
        raise HTTPException(403, "Please accept your invitation first")
    if u.status == "inactive":
        raise HTTPException(403, "Account is inactive")
    return {"access_token": make_token(u), "user": u}


# ---- Invitation acceptance (public — driven by the invite link) ----
@router.get("/accept-invite", response_model=InvitationInfoOut)
def validate_invite(token: str, db: Session = Depends(get_db)):
    """Called by the invite-link page to check the token before showing the accept form."""
    u = db.query(User).filter(User.invitation_token == token).first()
    if not u or u.status != "pending" or not token:
        raise HTTPException(410, "This invitation link is invalid or has expired")
    return InvitationInfoOut(email=u.email, full_name=u.full_name, role=u.role)


@router.post("/accept-invite", response_model=TokenOut)
def accept_invite(body: InvitationAcceptIn, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.invitation_token == body.token).first()
    if not u or u.status != "pending" or not body.token:
        raise HTTPException(410, "This invitation link is invalid or has expired")
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    u.password_hash = hash_pw(body.password)
    u.status = "accepted"
    u.accepted_at = datetime.utcnow()
    u.invitation_token = None          # single-use
    u.must_reset_pw = False
    db.commit()
    return {"access_token": make_token(u), "user": u}


@router.post("/set-password", response_model=TokenOut)
def set_password(body: SetPwIn, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.email == body.email.strip().lower()).first()
    if not u or not verify_pw(body.temp_password, u.password_hash):
        raise HTTPException(401, "Invalid temporary password")
    u.password_hash = hash_pw(body.new_password)
    u.must_reset_pw = False
    u.status = "active"
    db.commit()
    return {"access_token": make_token(u), "user": u}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(body: UpdateMeIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if body.full_name is not None and body.full_name.strip():
        user.full_name = body.full_name.strip()
    if body.phone is not None:
        user.phone = body.phone.strip()
    db.commit(); db.refresh(user)
    return user


@router.post("/change-password")
def change_password(body: ChangePwIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not verify_pw(body.current_password, user.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    if len(body.new_password) < 6:
        raise HTTPException(400, "New password must be at least 6 characters")
    user.password_hash = hash_pw(body.new_password)
    user.must_reset_pw = False
    db.commit()
    return {"success": True}
