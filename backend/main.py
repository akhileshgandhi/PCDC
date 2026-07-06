from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services.auth.router import auth_router
from services.simulation.router import simulation_router
from services.capability.router import capability_router
from services.ai.router import ai_router
from services.admin.router import admin_router
from services.faculty.router import faculty_router
from services.mentor.router import mentor_router
from services.notification.router import notification_router
from services.student.router import student_router

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*","http://183.182.87.172:5173"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(simulation_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(faculty_router, prefix="/api/v1")
app.include_router(capability_router, prefix="/capability")
app.include_router(ai_router, prefix="/ai")
app.include_router(mentor_router, prefix="/api/v1")
app.include_router(notification_router, prefix="/notification")
app.include_router(student_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Welcome to the PCDC API"}
