# SPEC_03 — JWT Auth Implementation + Seed Users

## Meta
- Sprint: 1
- Branch: feature/jwt-auth-seed-users
- Priority: Critical — blocks all role-based routing tests
- Backend: Yes
- Frontend: Yes

---

## Overview

Implement complete JWT authentication flow connecting the React
frontend to the FastAPI backend. Remove the register link from
the login page — PCDC is a closed system where users are imported
by admin, not self-registered. Create seed users for all 5 roles
so routing can be tested end to end immediately.

---

## Part 1 — Backend: Seed Users

### File to create
`backend/seeds/seed_users.py`

### Seed users to create

Create exactly these users. Passwords are hashed with bcrypt.
Run this script once against the Neon database.

```python
seed_users = [
  {
    "name": "Sanjay Mehta",
    "email": "student@pcdc.com",
    "password": "Student@123",
    "role": "student",
    "program": "MBA",
    "specialization": "Marketing"
  },
  {
    "name": "Priya Sharma",
    "email": "student2@pcdc.com",
    "password": "Student@123",
    "role": "student",
    "program": "MBA",
    "specialization": "Finance"
  },
  {
    "name": "Dr. Ananya Rao",
    "email": "faculty@pcdc.com",
    "password": "Faculty@123",
    "role": "faculty",
    "program": None,
    "specialization": "Strategy & Leadership"
  },
  {
    "name": "Prof. Rajesh Kumar",
    "email": "mentor@pcdc.com",
    "password": "Mentor@123",
    "role": "mentor",
    "program": None,
    "specialization": "General Management"
  },
  {
    "name": "Admin User",
    "email": "admin@pcdc.com",
    "password": "Admin@123",
    "role": "admin",
    "program": None,
    "specialization": None
  },
  {
    "name": "Dr. Vikram Nair",
    "email": "director@pcdc.com",
    "password": "Director@123",
    "role": "director",
    "program": None,
    "specialization": None
  }
]
```

### Seed script logic

```python
# backend/seeds/seed_users.py

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text
from passlib.context import CryptContext

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def run():
    with engine.connect() as conn:
        for user in seed_users:
            # Check if already exists
            existing = conn.execute(
                text("SELECT id FROM users WHERE email = :email"),
                {"email": user["email"]}
            ).fetchone()

            if existing:
                print(f"SKIP  {user['email']} — already exists")
                continue

            hashed = pwd_context.hash(user["password"])
            conn.execute(text("""
                INSERT INTO users
                  (name, email, password_hash, role, program, specialization)
                VALUES
                  (:name, :email, :password_hash, :role, :program, :specialization)
            """), {
                "name": user["name"],
                "email": user["email"],
                "password_hash": hashed,
                "role": user["role"],
                "program": user.get("program"),
                "specialization": user.get("specialization")
            })
            print(f"OK    {user['email']} ({user['role']})")

        conn.commit()
        print("\nSeed complete.")

if __name__ == "__main__":
    run()
```

### How to run the seed script

From the `backend/` folder:
```bash
python seeds/seed_users.py
```

Expected output:
```
OK    student@pcdc.com (student)
OK    student2@pcdc.com (student)
OK    faculty@pcdc.com (faculty)
OK    mentor@pcdc.com (mentor)
OK    admin@pcdc.com (admin)
OK    director@pcdc.com (director)

Seed complete.
```

Running again is safe — existing users are skipped, not duplicated.

---

## Part 2 — Backend: Auth Endpoint Verification

### Verify these endpoints work correctly

`POST /api/v1/auth/login`

Request:
```json
{
  "email": "student@pcdc.com",
  "password": "Student@123"
}
```

Expected response:
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

The JWT payload (decoded middle section) must contain:
```json
{
  "sub": "1",
  "email": "student@pcdc.com",
  "role": "student",
  "exp": 1234567890
}
```

**Critical**: `role` must be in the JWT payload — the frontend
decodes this to decide which portal to redirect to.
If `role` is missing from the current JWT, fix `create_access_token`
in `backend/services/auth/service.py` to include it.

`GET /api/v1/auth/me`

Header: `Authorization: Bearer {token}`

Expected response:
```json
{
  "id": 1,
  "name": "Sanjay Mehta",
  "email": "student@pcdc.com",
  "role": "student"
}
```

### Fix if role is missing from JWT

In `backend/services/auth/service.py`, ensure login_user passes
role into the token:

```python
def login_user(db: Session, email: str, password: str):
    user = db.execute(
        text("SELECT id, name, email, password_hash, role FROM users WHERE email = :email"),
        {"email": email}
    ).fetchone()

    if not user or not verify_password(password, user[3]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({
        "sub": str(user[0]),
        "email": user[2],
        "role": user[4]          # ← role MUST be here
    })
    return {"access_token": token, "token_type": "bearer"}
```

---

## Part 3 — Frontend: Login Page Changes

### Remove register link

In the login page component (currently showing
"New to PCDC? Register"), remove that line entirely.

Replace with:
```
Contact your program administrator for account access.
```

Style: small text, centered, text-secondary colour, no link.

### Final login page layout

```
┌─────────────────────────────────────┐
│  PCDC                               │
│  Capability Development Centre      │
│                                     │
│  Email                              │
│  [ email input ]                    │
│                                     │
│  Password                           │
│  [ password input ]  [ 👁 toggle ] │
│                                     │
│  [ → Login ]  (full width, navy)   │
│                                     │
│  [ error message area ]             │
│                                     │
│  Contact your program administrator │
│  for account access.                │
└─────────────────────────────────────┘
```

Add a password visibility toggle (eye icon) — students
frequently mistype passwords; this helps usability.

### Login flow logic

```javascript
// On form submit:
const handleLogin = async () => {
  setError("")
  setLoading(true)
  try {
    const res = await axios.post("/api/v1/auth/login", {
      email, password
    })
    const token = res.data.access_token
    localStorage.setItem("pcdc_token", token)

    // Decode role from JWT payload
    // JWT = header.payload.signature
    // Payload is base64url encoded JSON
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    )
    const role = payload.role

    // Redirect to correct portal
    const redirectMap = {
      student:  "/student/dashboard",
      faculty:  "/faculty/dashboard",
      mentor:   "/mentor/dashboard",
      admin:    "/admin/dashboard",
      director: "/director/dashboard"
    }
    navigate(redirectMap[role] || "/unauthorized")

  } catch (err) {
    const msg = err.response?.data?.detail || "Login failed. Please try again."
    setError(msg)
  } finally {
    setLoading(false)
  }
}
```

### Error states to handle

| Situation | Message shown |
|---|---|
| Wrong password | "Invalid email or password" |
| Email not found | "Invalid email or password" (same — don't reveal which) |
| Network error | "Unable to connect. Please try again." |
| Loading state | Button shows spinner + "Logging in..." text, disabled |

---

## Part 4 — Frontend: JWT Utility

### Create a shared JWT utility file

`frontend/src/utils/auth.js`

```javascript
// Get token from localStorage
export const getToken = () => localStorage.getItem("pcdc_token")

// Remove token (logout)
export const clearToken = () => localStorage.removeItem("pcdc_token")

// Decode JWT payload without a library
export const decodeToken = (token) => {
  try {
    const payload = token.split(".")[1]
    return JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    )
  } catch {
    return null
  }
}

// Get current user role
export const getUserRole = () => {
  const token = getToken()
  if (!token) return null
  const payload = decodeToken(token)
  return payload?.role || null
}

// Get current user info
export const getCurrentUser = () => {
  const token = getToken()
  if (!token) return null
  return decodeToken(token)
}

// Check if token is expired
export const isTokenExpired = () => {
  const token = getToken()
  if (!token) return true
  const payload = decodeToken(token)
  if (!payload?.exp) return true
  return Date.now() / 1000 > payload.exp
}

// Check if user is logged in and token is valid
export const isAuthenticated = () => {
  return !!getToken() && !isTokenExpired()
}
```

---

## Part 5 — Frontend: ProtectedRoute Update

Update the existing `ProtectedRoute.jsx` to use the new
auth utility instead of manual token decoding:

```javascript
// frontend/src/components/auth/ProtectedRoute.jsx

import { Navigate } from "react-router-dom"
import { isAuthenticated, getUserRole } from "../../utils/auth"

export default function ProtectedRoute({ children, allowedRole }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  const role = getUserRole()

  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}
```

---

## Part 6 — Frontend: Logout

### Add logout to all portal sidebars

In each sidebar component, add a logout button at the bottom:

```javascript
import { clearToken } from "../../utils/auth"
import { useNavigate } from "react-router-dom"

const handleLogout = () => {
  clearToken()
  navigate("/login")
}
```

Sidebar logout button style:
```
[ → Log Out ]
```
Position: bottom of sidebar, above nothing.
Style: text-secondary, small, with LogOut icon (Lucide).
On click: clear token + navigate to /login.

---

## Part 7 — Frontend: Root Route Redirect

Update the `/` root route in `App.jsx`:

```javascript
// If logged in and token valid → redirect to correct portal
// If not logged in → redirect to /login

import { isAuthenticated, getUserRole } from "./utils/auth"
import { Navigate } from "react-router-dom"

function RootRedirect() {
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  const role = getUserRole()
  const map = {
    student: "/student/dashboard",
    faculty: "/faculty/dashboard",
    mentor: "/mentor/dashboard",
    admin: "/admin/dashboard",
    director: "/director/dashboard"
  }
  return <Navigate to={map[role] || "/login"} replace />
}
```

---

## Part 8 — Placeholder Portal Pages

For roles that don't have full pages yet, the existing
placeholder pages are sufficient. Verify these exist and
show meaningful content (not blank screens):

```
/faculty/dashboard   → "Faculty Portal — Coming Soon"
/mentor/dashboard    → "Mentor Portal — Coming Soon"
/admin/dashboard     → "Admin Portal — Coming Soon"
/director/dashboard  → "Director Portal — Coming Soon"
```

Each placeholder should show:
- The portal name and role
- The logged-in user's name (decoded from JWT)
- A logout button
- Navy + gold styling consistent with the design system

---

## Testing Checklist

Test every combination before marking done.

### Seed users test
- [ ] Run seed script — all 6 users created without error
- [ ] Re-run seed script — all 6 skipped (no duplicates)
- [ ] Verify users appear in Neon dashboard → users table

### Login flow test (test each user)
| Email | Password | Expected redirect |
|---|---|---|
| student@pcdc.com | Student@123 | /student/dashboard |
| student2@pcdc.com | Student@123 | /student/dashboard |
| faculty@pcdc.com | Faculty@123 | /faculty/dashboard |
| mentor@pcdc.com | Mentor@123 | /mentor/dashboard |
| admin@pcdc.com | Admin@123 | /admin/dashboard |
| director@pcdc.com | Director@123 | /director/dashboard |

- [ ] All 6 logins redirect to correct portal
- [ ] Wrong password shows error message
- [ ] Error message does not reveal which field is wrong
- [ ] Login button shows loading state during request
- [ ] Register link is completely removed from login page
- [ ] "Contact administrator" text shows instead

### Route protection test
- [ ] Visit /student/dashboard without login → redirects to /login
- [ ] Visit /faculty/dashboard logged in as student → /unauthorized
- [ ] Visit /mentor/dashboard logged in as faculty → /unauthorized
- [ ] Visit / when logged in as mentor → /mentor/dashboard
- [ ] Visit / when not logged in → /login

### Logout test
- [ ] Logout clears token from localStorage
- [ ] After logout, visiting /student/dashboard → /login
- [ ] Logout works from all 5 portal sidebars

### JWT test
- [ ] Decoded JWT contains: sub, email, role, exp fields
- [ ] Token expiry works (set ACCESS_TOKEN_EXPIRE_MINUTES=1
      in .env temporarily, login, wait 1 min, refresh page
      → should redirect to /login)
- [ ] Restore ACCESS_TOKEN_EXPIRE_MINUTES=60 after testing

---

## Definition of Done

- [ ] Seed script runs cleanly and creates 6 users on Neon
- [ ] All 6 users can log in successfully
- [ ] JWT contains role field
- [ ] Each role redirects to its correct portal after login
- [ ] Register link removed from login page
- [ ] "Contact administrator" text shown instead
- [ ] Password visibility toggle works
- [ ] ProtectedRoute blocks wrong-role access
- [ ] Root / redirects correctly based on auth state
- [ ] Logout works from all portals
- [ ] auth.js utility file created and used throughout
- [ ] Committed on branch feature/jwt-auth-seed-users
