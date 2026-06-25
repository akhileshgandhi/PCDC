from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .seed import init_and_seed
from .routers import auth, master, users, case_studies, student

app = FastAPI(title="PCDC API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_origin_regex=r"https://.*\.vercel\.app",   # any Vercel frontend deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup():
    init_and_seed()


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "pcdc-api"}


app.include_router(auth.router)
app.include_router(master.router)
app.include_router(users.router)
app.include_router(case_studies.router)
app.include_router(student.router)
