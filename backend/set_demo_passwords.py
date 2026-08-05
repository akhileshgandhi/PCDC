import bcrypt
from sqlalchemy import create_engine, text
import os, dotenv
dotenv.load_dotenv()

engine = create_engine(os.getenv("DATABASE_URL"))

def hash_pw(pw):
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

with engine.connect() as conn:
    deepak = conn.execute(text("SELECT id, name, email, role FROM users WHERE email ILIKE '%deepak%'")).fetchone()
    aman = conn.execute(text("SELECT id, name, email, role FROM users WHERE email = 'amanpreetdutta09@gmail.com'")).fetchone()
    print("Deepak:", deepak)
    print("Amanpreet:", aman)

    conn.execute(text("UPDATE users SET password_hash = :ph WHERE id = :id"), {"ph": hash_pw("Faculty@123"), "id": deepak.id})
    conn.execute(text("UPDATE users SET password_hash = :ph WHERE id = :id"), {"ph": hash_pw("Student@123"), "id": aman.id})
    conn.commit()
    print("Passwords updated!")
