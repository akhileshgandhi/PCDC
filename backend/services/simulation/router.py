from fastapi import APIRouter

simulation_router = APIRouter()

@simulation_router.get("/health")
async def health_check():
    return {"status": "Simulation service is healthy"}