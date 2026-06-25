# PCDC — Project Overview

> **AI-powered Capability Development Platform for business students.**

PCDC (Prestige Capability Development Centre) is a platform that
measures, develops, and evaluates real-world capabilities of students
through AI-driven case studies, simulations, and coaching.

The platform shifts education from answer evaluation to capability
evaluation — rewarding how students think, not what they copy.

---

## 1. Product Vision

Traditional education systems reward:
- Finding the right answer
- Completing tasks
- Memorising content

PCDC rewards:
- Quality of thinking
- Depth of analysis
- Judgment and decision making
- Creativity and innovation
- Learning agility

---

## 2. Core Users

| Role | Description |
|---|---|
| Student | Attempts case studies, interacts with AI coach, builds capability profile |
| Faculty | Creates case studies, builds rubrics, monitors cohort analytics |
| Mentor | Coaches 25 students, reviews thinking paths, schedules interventions |
| Program Head | Views program-wide analytics and capability trends |
| Director | Institution-wide executive dashboard |
| Admin | Platform configuration, user management, imports |

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Python + FastAPI |
| Database | PostgreSQL on Neon (cloud) |
| ORM / Migrations | SQLAlchemy + Alembic |
| AI Primary | Anthropic Claude API (claude-sonnet-4-6) |
| AI Fallback | Ollama (local, for lighter tasks) |
| Auth | JWT tokens + role-based access control |
| Notifications | Email (future: WhatsApp) |

---

## 4. Project Structure

```
pcdc/
├── backend/
│   ├── main.py                  ← FastAPI app entry point
│   ├── requirements.txt
│   ├── .env                     ← never commit this
│   ├── alembic/                 ← migration scripts
│   │   └── versions/
│   ├── shared/
│   │   ├── database.py          ← SQLAlchemy engine + get_db
│   │   └── middleware.py
│   └── services/
│       ├── auth/                ← register, login, JWT
│       ├── simulation/          ← case studies + attempts
│       ├── capability/          ← scoring engine
│       ├── ai/                  ← Claude + Ollama integration
│       ├── mentor/              ← mentor dashboard + alerts
│       └── notification/        ← email alerts
├── frontend/
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── hooks/
│       └── api/                 ← Axios API calls
└── database/
    └── schema.sql               ← reference only, use Alembic
```

---

## 5. Database Tables

### Existing (migration 0001)
- `users` — all user types unified by role field
- `students` — student-specific profile
- `capabilities` — 8 core capabilities
- `student_capabilities` — per-student scores
- `career_tracks` — consulting, finance, marketing etc.
- `simulations` — legacy simulation table
- `simulation_attempts`
- `ai_conversations`
- `reflections`
- `mentors`
- `interventions`
- `achievements`

### Case Studies (migration 0002)
- `case_studies` — core case content
- `case_study_tags` — domain/career/capability tags
- `case_study_attempts` — one per student (enforced unique)
- `cs_evaluations` — AI scoring breakdown
- `cs_ai_conversations` — full conversation log

---

## 6. API Structure

All backend endpoints follow this pattern:

```
/api/v1/{module}/{action}
```

Examples:
```
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
POST /api/v1/cases/create
GET  /api/v1/cases/list
POST /api/v1/cases/attempt/start
POST /api/v1/cases/attempt/submit-analysis
POST /api/v1/cases/attempt/ai-message
```

---

## 7. Role-Based Access

| Endpoint type | Allowed roles |
|---|---|
| Create case study | faculty, mentor, admin |
| Publish case study | faculty, admin |
| Start attempt | student |
| View own attempt | student |
| View assigned student attempts | mentor |
| View all attempts | faculty, admin |
| Mentor dashboard | mentor |
| Program analytics | program_head, director, admin |

---

## 8. AI Evaluation Weights

Every case study attempt is scored by Claude using these weights:

| Dimension | Weight |
|---|---|
| Thinking depth | 30% |
| Logic | 20% |
| Creativity | 15% |
| Practicality | 15% |
| Risk awareness | 10% |
| Reflection | 10% |

---

## 9. Case Study Domains

Supported domains for tagging:
- `geopolitics`
- `sports`
- `business`
- `social`
- `science`
- `technology`
- `environment`
- `healthcare`

---

## 10. Key Business Rules

1. Students get ONE attempt per case study — enforced at DB level
2. AI is locked until student submits initial analysis (min 200 words)
3. Every AI conversation is logged for mentor review
4. Capability scores update after every completed attempt
5. Mentors are assigned max 25 students
6. Difficulty auto-adjusts if student consistently scores above 85%

---

## 11. Environment Variables

```env
# Database (Neon pooler URL)
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require

# Auth
SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# AI
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# App
APP_ENV=development
FRONTEND_URL=http://localhost:5173
```

---

## 12. Pilot Scope

The pilot targets:
- 5–10 students
- 2 faculty members
- 1–2 mentors
- Hosted locally (backend on PC, DB on Neon)
- 3–5 case studies across different domains

---

## 13. Development Rules for Cline

- Always read this `project-overview.md` before making changes
- Always read the relevant SPEC_XX file before implementing a feature
- Never change database schema directly — use Alembic migrations
- Use raw SQL with `sqlalchemy.text()` — no SQLAlchemy ORM models
- All imports from `shared/` must use `from shared.x import y` (not relative)
- Never commit `.env` file
- Never add features not in the current SPEC file
- Backend runs on port 8000, frontend on port 5173
- Test every endpoint in `/docs` before marking feature complete
