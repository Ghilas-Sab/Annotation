from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from app.routers.projects import router as projects_router
from app.routers.videos import router as videos_router
from app.routers.annotations import router as annotations_router
from app.routers.statistics import router as statistics_router
from app.routers.exports import router as exports_router
from app.routers.categories import router as categories_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects_router, prefix="/api/v1")
app.include_router(videos_router, prefix="/api/v1")
app.include_router(annotations_router, prefix="/api/v1")
app.include_router(statistics_router, prefix="/api/v1")
app.include_router(exports_router, prefix="/api/v1")
app.include_router(categories_router, prefix="/api/v1")


@app.get("/api/v1/health")
async def health_check():
    return {"status": "ok"}
