from fastapi import APIRouter

notification_router = APIRouter()

@notification_router.get("/health")
async def health_check():
    return {"status": "Notification service is healthy"}