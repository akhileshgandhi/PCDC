# Coding Standards

## Python (Backend)

- Python 3.11+
- No type: ignore comments — fix the actual type issue
- Use type hints on all function signatures
- Keep functions under 50 lines where possible
- Use descriptive variable names — no single letters except loop counters
- Use f-strings for string formatting
- Use `Optional[str]` not `str | None` for compatibility

### FastAPI patterns

```python
# Router setup — always use APIRouter with prefix and tags
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from shared.database import get_db

router = APIRouter(prefix="/cases", tags=["cases"])

# Endpoint pattern — always type the response
@router.post("/create", status_code=201)
def create_case(data: CaseStudyCreate, db: Session = Depends(get_db)):
    try:
        result = create_case_study(db, data)
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"CREATE CASE ERROR: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
```

### Database patterns

Always use raw SQL with `sqlalchemy.text()`. Never use SQLAlchemy ORM models.

```python
from sqlalchemy import text

# SELECT
row = db.execute(
    text("SELECT id, title FROM case_studies WHERE id = :id"),
    {"id": case_id}
).fetchone()

if not row:
    raise HTTPException(status_code=404, detail="Case study not found")

# INSERT with RETURNING
result = db.execute(
    text("""
        INSERT INTO case_studies (title, content, domain, difficulty, created_by)
        VALUES (:title, :content, :domain, :difficulty, :created_by)
        RETURNING id, title, created_at
    """),
    {"title": data.title, "content": data.content,
     "domain": data.domain, "difficulty": data.difficulty,
     "created_by": user_id}
)
db.commit()
row = result.fetchone()

# UPDATE
db.execute(
    text("UPDATE case_study_attempts SET status = :status WHERE id = :id"),
    {"status": "ai_discussion", "id": attempt_id}
)
db.commit()
```

### Pydantic schemas

```python
from pydantic import BaseModel
from typing import Optional, List

# All schemas go in the module's models.py file
class CaseStudyCreate(BaseModel):
    title: str
    content: str
    domain: str
    difficulty: int
    estimated_minutes: int = 45
    tags: List[dict] = []
```

### Import rules

```python
# CORRECT — always use absolute imports from shared
from shared.database import get_db
from shared.middleware import get_current_user

# WRONG — never use relative imports for shared
from ..shared.database import get_db  # breaks on Windows
```

---

## React (Frontend)

- Functional components only — no class components
- One component per file
- Component files use PascalCase: `StudentDashboard.jsx`
- Hook files use camelCase: `useCapabilityScores.js`
- Keep components focused — one job per component

### Component pattern

```jsx
// Always define prop types at top, return JSX at bottom
import { useState, useEffect } from "react"
import api from "../api/axios"

export default function CaseCard({ caseStudy, onSelect }) {
  const [loading, setLoading] = useState(false)

  const handleSelect = async () => {
    setLoading(true)
    try {
      await onSelect(caseStudy.id)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-medium text-gray-900">{caseStudy.title}</h3>
      <button
        onClick={handleSelect}
        disabled={loading}
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
      >
        {loading ? "Loading..." : "Start attempt"}
      </button>
    </div>
  )
}
```

### API calls

```javascript
// src/api/axios.js — single Axios instance
import axios from "axios"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1",
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("pcdc_token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api
```

---

## File Organization

### Backend

```
backend/services/{module}/
├── __init__.py
├── router.py     ← FastAPI APIRouter, endpoint definitions only
├── models.py     ← Pydantic schemas only
└── service.py    ← all business logic and DB queries
```

### Frontend

```
frontend/src/
├── pages/           ← one file per route
├── components/      ← reusable UI components
│   └── {feature}/   ← grouped by feature
├── hooks/           ← custom React hooks
├── api/             ← Axios instance and API helpers
└── utils/           ← pure utility functions
```

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Python files | snake_case | `case_service.py` |
| Python functions | snake_case | `create_case_study()` |
| Python classes | PascalCase | `CaseStudyCreate` |
| Python constants | SCREAMING_SNAKE | `MAX_WORD_COUNT` |
| React components | PascalCase | `CaseAttempt.jsx` |
| React hooks | camelCase with use prefix | `useStudentProfile.js` |
| API endpoints | kebab-case | `/submit-analysis` |
| DB tables | snake_case | `case_study_attempts` |
| DB columns | snake_case | `student_id` |
| Env variables | SCREAMING_SNAKE | `ANTHROPIC_API_KEY` |

---

## Error Response Format

All backend errors must follow this format:

```json
{
  "detail": "Human-readable error message here"
}
```

FastAPI uses `detail` by default. Never expose stack traces or
internal errors to the client. Log them server-side with `print()`.

---

## HTTP Status Codes

| Situation | Code |
|---|---|
| Success (GET, PUT) | 200 |
| Created (POST) | 201 |
| Bad input / validation error | 400 |
| Unauthorized (no token) | 401 |
| Forbidden (wrong role) | 403 |
| Not found | 404 |
| Conflict (duplicate) | 409 |
| Server error | 500 |

---

## Security Rules

- Never return `password_hash` in any API response
- Always verify JWT token on protected endpoints
- Always check role before allowing create/publish/admin actions
- Always check resource ownership (student can only see own attempts)
- Never use f-strings to build SQL queries — always use parameterized queries
- Never log API keys or passwords

---

## Testing Checklist (before marking done)

- [ ] Open `http://127.0.0.1:8000/docs` and test every new endpoint
- [ ] Test with missing required fields (should return 400)
- [ ] Test with invalid token (should return 401)
- [ ] Test with wrong role (should return 403)
- [ ] Test the happy path end to end
- [ ] Check browser console for errors in frontend
- [ ] Verify DB has correct data after each operation (check Neon dashboard)
