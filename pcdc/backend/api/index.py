"""Vercel Python serverless entrypoint — exposes the FastAPI ASGI app.

Vercel's @vercel/python runtime serves the module-level `app` (ASGI). We also
seed on cold start because Vercel may not run ASGI lifespan/startup events.
"""
from app.main import app  # noqa: F401  (Vercel serves this `app`)
from app.seed import init_and_seed

try:
    init_and_seed()
except Exception as e:  # pragma: no cover - keep the function alive even if seeding races
    print("init_and_seed warning:", e)
