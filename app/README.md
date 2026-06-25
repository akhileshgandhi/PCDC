# PCDC — Working Prototype (Flask + SQLite)

A runnable prototype with a database, seeded dummy data, and three role logins.

## Run it
```
python C:\Users\user\Downloads\Prestige\app\app.py
```
Then open **http://127.0.0.1:8099** in your browser.

(The database `pcdc.db` is created and seeded automatically on first run. Delete it to reset.)

## Demo logins
| Role | Email | Password |
|---|---|---|
| Admin | admin@pcdc.in | admin123 |
| Mentor (Dr. Sanjeev Patni, Marketing) | mentor@pcdc.in | mentor123 |
| Student (Sanjay Kumar, Marketing) | student@pcdc.in | student123 |

You can also use the **role switcher in the top bar** to jump between the three seeded users during a demo.

## What's wired to the database
- **Login / logout / sessions** (3 users) + extra seeded mentors & students for lists.
- **Admin:** dashboard counts · Subjects (add / delete — persists) · Settings (Capabilities + Marks Scheme) · Mentors · Students · Campaigns → Campaign detail (responses) → Scorecard — all from the DB.
- **Mentor:** dashboard + Case Studies + Responses + Scorecard + Students — **scoped to the mentor's subject**. Create Case Study (wizard) **inserts a new live case** into the DB.
- **Student:** Home + My Tasks (assigned cases, completed ones show their mark) + Assessment loop + My Progress.

## Stack
Flask + SQLite (stdlib) + Jinja templates + the final design system (`static/styles.css`).
This mirrors the mandated production stack conceptually (swap Flask→FastAPI, SQLite→PostgreSQL later).

## Files
- `app.py` — routes, auth, DB schema + seed
- `templates/` — all pages (base layout + per-screen)
- `static/styles.css` — design system
- `pcdc.db` — SQLite database (auto-created)
