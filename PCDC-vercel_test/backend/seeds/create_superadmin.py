"""Create a Central Admin (role='superadmin') account.

Idempotent: if a user with the given email already exists, nothing is changed.

Usage (from the backend/ folder):
    python seeds/create_superadmin.py --name "Central Admin" --email central@pcdc.in

The password is read from the SUPERADMIN_PASSWORD environment variable, or
prompted for interactively — it is never passed on the command line or stored
in this file. Name/email can also come from SUPERADMIN_NAME/SUPERADMIN_EMAIL.
"""

import argparse
import getpass
import os
import sys

import bcrypt
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BACKEND_DIR)

load_dotenv(os.path.join(BACKEND_DIR, ".env"))


def run() -> None:
    parser = argparse.ArgumentParser(description="Create a PCDC superadmin (Central Admin).")
    parser.add_argument("--name", default=os.getenv("SUPERADMIN_NAME"))
    parser.add_argument("--email", default=os.getenv("SUPERADMIN_EMAIL"))
    args = parser.parse_args()

    name = (args.name or "").strip()
    email = (args.email or "").strip().lower()
    if not name or not email:
        parser.error("--name and --email are required (or set SUPERADMIN_NAME / SUPERADMIN_EMAIL)")

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set")

    engine = create_engine(database_url)
    with engine.connect() as conn:
        existing = conn.execute(
            text("SELECT id, role FROM users WHERE LOWER(email) = :email"),
            {"email": email},
        ).fetchone()
        if existing:
            print(f"SKIP  {email} already exists (id={existing.id}, role={existing.role}); nothing changed.")
            return

        password = os.getenv("SUPERADMIN_PASSWORD") or getpass.getpass("Password for the new superadmin: ")
        if len(password) < 8:
            raise SystemExit("Password must be at least 8 characters.")
        if len(password.encode("utf-8")) > 72:
            raise SystemExit("Password must be 72 bytes or fewer.")
        password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        row = conn.execute(
            text("""
                INSERT INTO users (name, email, password_hash, role, status, updated_at)
                VALUES (:name, :email, :password_hash, 'superadmin', 'active', NOW())
                RETURNING id
            """),
            {"name": name, "email": email, "password_hash": password_hash},
        ).fetchone()
        conn.commit()
        print(f"OK    created superadmin {email} (id={row.id})")


if __name__ == "__main__":
    run()
