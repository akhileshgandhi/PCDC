import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings


def _resolve_db_url() -> str:
    raw = (settings.DATABASE_URL or "").strip().strip('"').strip("'")
    # A real Postgres URL (e.g. Neon/Render) always wins.
    if raw.startswith("postgres://"):
        return raw.replace("postgres://", "postgresql://", 1)
    if raw.startswith("postgresql"):
        return raw
    # On Vercel the filesystem is read-only except /tmp.
    if os.environ.get("VERCEL"):
        return "sqlite:////tmp/pcdc.db"
    # Local dev / anything else with a valid URL.
    return raw if "://" in raw else "sqlite:///./pcdc.db"


DB_URL = _resolve_db_url()
connect_args = {"check_same_thread": False} if DB_URL.startswith("sqlite") else {}
engine = create_engine(DB_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
