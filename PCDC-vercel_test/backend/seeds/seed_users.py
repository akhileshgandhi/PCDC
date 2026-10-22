import os
import sys
from typing import Any, Dict, List, Optional

import bcrypt
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

seed_users: List[Dict[str, Any]] = [
    {
        "name": "Sanjay Mehta",
        "email": "student@pcdc.com",
        "password": "Student@123",
        "role": "student",
        "program": "MBA",
        "specialization": "Marketing",
    },
    {
        "name": "Priya Sharma",
        "email": "student2@pcdc.com",
        "password": "Student@123",
        "role": "student",
        "program": "MBA",
        "specialization": "Finance",
    },
    {
        "name": "Dr. Ananya Rao",
        "email": "faculty@pcdc.com",
        "password": "Faculty@123",
        "role": "faculty",
        "program": None,
        "specialization": "Strategy & Leadership",
    },
    {
        "name": "Prof. Rajesh Kumar",
        "email": "mentor@pcdc.com",
        "password": "Mentor@123",
        "role": "mentor",
        "program": None,
        "specialization": "General Management",
    },
    {
        "name": "Admin User",
        "email": "admin@pcdc.com",
        "password": "Admin@123",
        "role": "admin",
        "program": None,
        "specialization": None,
    },
    {
        "name": "Dr. Vikram Nair",
        "email": "director@pcdc.com",
        "password": "Director@123",
        "role": "director",
        "program": None,
        "specialization": None,
    },
]


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


def insert_seed_user(conn: Any, user: Dict[str, Optional[str]]) -> None:
    existing = conn.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": user["email"]},
    ).fetchone()

    if existing:
        print(f"SKIP  {user['email']} - already exists")
        return

    result = conn.execute(
        text(
            """
            INSERT INTO users
              (name, email, password_hash, role, program, specialization)
            VALUES
              (:name, :email, :password_hash, :role, :program, :specialization)
            RETURNING id
            """
        ),
        {
            "name": user["name"],
            "email": user["email"],
            "password_hash": hash_password(str(user["password"])),
            "role": user["role"],
            "program": user.get("program"),
            "specialization": user.get("specialization"),
        },
    )
    user_id = result.fetchone().id

    if user["role"] == "student":
        student_row = conn.execute(
            text("INSERT INTO students (user_id, current_level) VALUES (:user_id, 1) RETURNING id"),
            {"user_id": user_id},
        ).fetchone()
        capability_rows = conn.execute(text("SELECT id FROM capabilities")).fetchall()
        for capability in capability_rows:
            conn.execute(
                text(
                    """
                    INSERT INTO student_capabilities (student_id, capability_id, current_score)
                    VALUES (:student_id, :capability_id, 0)
                    ON CONFLICT DO NOTHING
                    """
                ),
                {"student_id": student_row.id, "capability_id": capability.id},
            )
    elif user["role"] == "mentor":
        conn.execute(
            text("INSERT INTO mentors (user_id, max_students) VALUES (:user_id, 25)"),
            {"user_id": user_id},
        )

    print(f"OK    {user['email']} ({user['role']})")


def run() -> None:
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set")

    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        for user in seed_users:
            insert_seed_user(conn, user)

        conn.commit()
        print("\nSeed complete.")


if __name__ == "__main__":
    run()
