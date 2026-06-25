from fastapi import APIRouter

mentor_router = APIRouter()

@mentor_router.get("/health")
async def health_check():
    return {"status": "Mentor service is healthy"}