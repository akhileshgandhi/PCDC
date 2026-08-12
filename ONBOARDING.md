# PCDC Case Studio — Developer Onboarding

An AI-evaluated business case-study platform with **Admin**, **Faculty**, and
**Student** portals.

- **Frontend:** React + Vite + TypeScript + Tailwind (`frontend/`)
- **Backend:** Python FastAPI + SQLAlchemy + Alembic (`backend/`)
- **Database:** PostgreSQL (Neon)
- **AI:** Google Gemini (`gemini-flash-latest`)

---

## Prerequisites

- **Node.js** 18+ and npm
- **Conda** with the **`PCDC`** environment (Python 3.11+)
- The `backend/.env` file (DB, Gemini, SMTP, Google credentials) — already present
  locally; ask a teammate if missing. It is **gitignored** and never committed.

---

## First-time setup

**Backend** (install deps + apply DB migrations):
```cmd
cd backend
conda activate PCDC
pip install -r requirements.txt
python -m alembic upgrade head
```

**Frontend** (install deps):
```cmd
cd frontend
npm install
```

---

## Running the app (two terminals)

You need **both** servers running.

### Terminal 1 — Backend (FastAPI, port 8000)
```cmd
cd backend
conda activate PCDC
python -m uvicorn main:app --reload --port 8000
```
If `conda activate PCDC` misbehaves, call the env Python directly:
```cmd
"C:\Users\user\.conda\envs\PCDC\python.exe" -m uvicorn main:app --reload --port 8000
```

### Terminal 2 — Frontend (Vite, port 5173)
```cmd
cd frontend
npm run dev
```

### Open
```
http://localhost:5173
```

> The frontend auto-targets the backend at `http://localhost:8000/api/v1` in dev,
> so the backend **must** run on port **8000**. Stop either server with **Ctrl-C**.

---

## Test accounts (shared demo DB)

| Role | Login | Password |
|---|---|---|
| Admin | `admin@pcdc.com` | `Admin@123` |
| Faculty | `deepak.k@pcdc.in` | `Faculty@123` |
| Student | `amanpreetdutta09@gmail.com` | `Student@123` |
| Student (first login) | `123456789` | `123456789` (forces a password change) |

Students log in with their **email or scholar number**.

---

## Common tasks

| Task | Command (from the folder shown) |
|---|---|
| Run backend | `backend`: `python -m uvicorn main:app --reload --port 8000` |
| Run frontend | `frontend`: `npm run dev` |
| Frontend type-check | `frontend`: `npx tsc -b` |
| Frontend production build | `frontend`: `npm run build` |
| Create a DB migration | `backend`: `python -m alembic revision -m "msg"` |
| Apply migrations | `backend`: `python -m alembic upgrade head` |

---

## Project layout

```
backend/
  main.py                 # FastAPI app entry (app = FastAPI())
  services/               # auth, admin, faculty, simulation (cases), student
  shared/                 # database.py, llm.py (Gemini), email.py (SMTP)
  alembic/versions/       # DB migrations (0001 … latest)
  .env                    # secrets (gitignored)
frontend/
  src/pages/              # admin/, faculty/, student/, auth/
  src/api/                # axios clients (admin.ts, faculty.ts, …)
  src/layouts/            # AdminLayout, FacultyLayout
```

---

## How the portals fit together

1. **Admin** builds the academic structure (Institutions → Departments → Courses →
   Semesters → Sections → Subjects) and manages people.
2. **Admin** invites **faculty** (emailed set-password link) and adds **students**
   to sections (People → Students; scholar number is the first password).
3. **Faculty** pick what they teach in **My Teaching**; their sections' students
   then appear automatically under **Students**.
4. **Faculty** build/assign case studies; **students** attempt them (initial
   analysis → written answers → AI rapid-fire → rubric-based AI evaluation).

---

## Troubleshooting

- **Login/API calls fail from the frontend** → the backend isn't running on port
  8000, or it wasn't restarted after code/.env changes. Restart Terminal 1.
- **`conda activate` fails** → use the direct-Python form shown above.
- **DB errors about missing columns** → run `python -m alembic upgrade head`.
- **AI (rapid fire / evaluation) slow or failing** → depends on the Gemini API;
  retry. Check `GEMINI_API_KEY` in `backend/.env`.
- **Google Sign-In errors on a new domain** → add the domain to Authorized
  JavaScript origins in Google Cloud Console.
