from fastapi import APIRouter

capability_router = APIRouter()

@capability_router.get("/health")
async def health_check():
    return {"status": "Capability service is healthy"}