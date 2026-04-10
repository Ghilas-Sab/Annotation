import os
from fastapi import APIRouter, HTTPException
from app.storage import json_store
from app.schemas.project import ProjectCreate, ProjectRead
from app.config import settings

router = APIRouter(tags=["projects"])


@router.post("/projects", response_model=ProjectRead, status_code=201)
async def create_project(body: ProjectCreate):
    return json_store.create_project(body.name, body.description)


@router.get("/projects", response_model=list[ProjectRead])
async def list_projects():
    projects = json_store.get_projects()
    return sorted(projects, key=lambda p: p["created_at"], reverse=True)


@router.get("/projects/{project_id}", response_model=ProjectRead)
async def get_project(project_id: str):
    project = json_store.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    return project


@router.put("/projects/{project_id}", response_model=ProjectRead)
async def update_project(project_id: str, body: ProjectCreate):
    updated = json_store.update_project(project_id, name=body.name, description=body.description)
    if not updated:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    return updated


@router.delete("/projects/{project_id}", status_code=204)
async def delete_project(project_id: str):
    project = json_store.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    for video in project.get("videos", []):
        filepath = os.path.join(settings.VIDEOS_DIR, video.get("filename", ""))
        if os.path.exists(filepath):
            os.remove(filepath)
    json_store.delete_project(project_id)
