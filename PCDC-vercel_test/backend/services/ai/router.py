from fastapi import APIRouter

ai_router = APIRouter()

@ai_router.get("/health")
async def health_check():
    return {"status": "AI service is healthy"}