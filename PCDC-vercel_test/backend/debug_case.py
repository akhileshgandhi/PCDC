import json
from sqlalchemy import create_engine, text
import os, dotenv
dotenv.load_dotenv()

engine = create_engine(os.getenv("DATABASE_URL"))

with engine.connect() as conn:
    row = conn.execute(text("""
        SELECT id, title, content
        FROM case_studies
        WHERE title ILIKE '%Growing Sales%'
        ORDER BY id DESC LIMIT 1
    """)).fetchone()

    if not row:
        print("Case not found!")
    else:
        print(f"Case ID: {row.id}")
        print(f"Title: {row.title}")
        print()
        if row.content:
            parsed = json.loads(row.content)
            sections = parsed.get("sections", {})
            print("=== SECTIONS IN content JSON ===")
            for key, val in sections.items():
                preview = str(val)[:150] if val else "(empty)"
                print(f"  {key}: {preview}")
        else:
            print("content column is NULL")

    # Check if attempt was already started
    attempts = conn.execute(text("""
        SELECT id, student_id, status, content, created_at
        FROM case_study_attempts
        WHERE case_study_id = :cid
        ORDER BY id DESC LIMIT 3
    """), {"cid": row.id}).fetchall()
    print(f"\n=== ATTEMPTS ({len(attempts)}) ===")
    for a in attempts:
        content_preview = a.content[:200] if a.content else "NULL"
        print(f"  Attempt {a.id}: status={a.status}, created={a.created_at}")
        print(f"    content preview: {content_preview}")
