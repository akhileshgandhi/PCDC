import os
import sys

# Ensure this backend directory is importable when the app is loaded from a
# different working directory (e.g. Vercel serverless runs from /var/task).
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.auth.router import auth_router
from services.simulation.router import simulation_router
from services.capability.router import capability_router
from services.ai.router import ai_router
from services.admin.router import admin_router
from services.faculty.router import faculty_router
from services.bank.router import bank_router
from services.notification.router import notification_router
from services.student.router import student_router

app = FastAPI()

# CORS middleware
# allow_origin_regex matches localhost or any IPv4-addressed origin on the
# Vite dev server port, so access from any machine on the network keeps
# working regardless of which IP it has, without opening the API up to
# arbitrary hostnames/websites. A regex match still gets the requesting
# Origin reflected back correctly with credentials (unlike a literal "*",
# which is invalid combined with allow_credentials).
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|(\d{1,3}\.){3}\d{1,3}):5173",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(simulation_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(faculty_router, prefix="/api/v1")
app.include_router(bank_router, prefix="/api/v1")
app.include_router(capability_router, prefix="/capability")
app.include_router(ai_router, prefix="/ai")
app.include_router(notification_router, prefix="/notification")
app.include_router(student_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Welcome to the PCDC API"}
