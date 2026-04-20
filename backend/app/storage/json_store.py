import json
import os
import uuid
import tempfile
from datetime import datetime, timezone
from pathlib import Path


def _data_dir() -> Path:
    return Path(os.getenv("DATA_DIR", "/data"))


def _projects_file() -> Path:
    d = _data_dir()
    d.mkdir(parents=True, exist_ok=True)
    return d / "projects.json"


def _load() -> dict:
    f = _projects_file()
    if not f.exists():
        return {"projects": []}
    return json.loads(f.read_text(encoding="utf-8"))


def _save(data: dict) -> None:
    f = _projects_file()
    tmp = f.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, f)  # atomique sur tous les OS


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_projects() -> list[dict]:
    return _load()["projects"]


def get_project(project_id: str) -> dict | None:
    return next((p for p in get_projects() if p["id"] == project_id), None)


def create_project(name: str, description: str = "") -> dict:
    data = _load()
    project = {
        "id": str(uuid.uuid4()),
        "name": name,
        "description": description,
        "created_at": _now(),
        "videos": [],
    }
    data["projects"].append(project)
    _save(data)
    return project


def update_project(project_id: str, **kwargs) -> dict | None:
    data = _load()
    for p in data["projects"]:
        if p["id"] == project_id:
            p.update({k: v for k, v in kwargs.items() if k in ("name", "description")})
            _save(data)
            return p
    return None


def delete_project(project_id: str) -> bool:
    data = _load()
    before = len(data["projects"])
    data["projects"] = [p for p in data["projects"] if p["id"] != project_id]
    if len(data["projects"]) < before:
        _save(data)
        return True
    return False


DEFAULT_CATEGORY_NAME = "Par défaut"
DEFAULT_CATEGORY_COLOR = "#9CA3AF"


def _make_default_category(video_id: str) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "video_id": video_id,
        "name": DEFAULT_CATEGORY_NAME,
        "color": DEFAULT_CATEGORY_COLOR,
        "created_at": _now(),
        "is_default": True,
    }


def add_video_to_project(project_id: str, video_data: dict) -> dict | None:
    """Ajoute une vidéo dans le projet. Retourne la vidéo ou None si projet absent."""
    data = _load()
    for project in data["projects"]:
        if project["id"] == project_id:
            video_data.setdefault("categories", [_make_default_category(video_data["id"])])
            project.setdefault("videos", []).append(video_data)
            _save(data)
            return video_data
    return None


def get_video(video_id: str) -> dict | None:
    """Cherche une vidéo dans tous les projets."""
    for project in get_projects():
        for video in project.get("videos", []):
            if video["id"] == video_id:
                return video
    return None


def update_video(video_id: str, **kwargs) -> dict | None:
    data = _load()
    for project in data["projects"]:
        for video in project.get("videos", []):
            if video["id"] == video_id:
                video.update({k: v for k, v in kwargs.items() if k in ("original_name",)})
                _save(data)
                return video
    return None


def delete_video(video_id: str) -> bool:
    """Supprime une vidéo (+ ses annotations) d'un projet."""
    data = _load()
    for project in data["projects"]:
        videos = project.get("videos", [])
        for i, video in enumerate(videos):
            if video["id"] == video_id:
                del videos[i]
                _save(data)
                return True
    return False


# --- Annotations ---

def add_annotation(video_id: str, annotation_data: dict) -> dict | None:
    data = _load()
    for project in data["projects"]:
        for video in project.get("videos", []):
            if video["id"] == video_id:
                video.setdefault("annotations", []).append(annotation_data)
                _save(data)
                return annotation_data
    return None


def get_annotations(video_id: str) -> list[dict] | None:
    video = get_video(video_id)
    if video is None:
        return None
    return video.get("annotations", [])


def update_annotation(annotation_id: str, **kwargs) -> dict | None:
    data = _load()
    for project in data["projects"]:
        for video in project.get("videos", []):
            for ann in video.get("annotations", []):
                if ann["id"] == annotation_id:
                    ann.update({k: v for k, v in kwargs.items() if k in ("frame_number", "timestamp_ms", "label", "category_id")})
                    ann["updated_at"] = _now()
                    _save(data)
                    return ann
    return None


def delete_annotation(annotation_id: str) -> bool:
    data = _load()
    for project in data["projects"]:
        for video in project.get("videos", []):
            annotations = video.get("annotations", [])
            for i, ann in enumerate(annotations):
                if ann["id"] == annotation_id:
                    del annotations[i]
                    _save(data)
                    return True
    return False


# --- Categories ---

def get_categories(video_id: str) -> list[dict] | None:
    video = get_video(video_id)
    if video is None:
        return None
    categories = video.get("categories", [])
    if not categories:
        # Migration lazy : créer la catégorie par défaut si absente
        default_cat = _make_default_category(video_id)
        data = _load()
        for project in data["projects"]:
            for v in project.get("videos", []):
                if v["id"] == video_id:
                    v.setdefault("categories", []).append(default_cat)
                    _save(data)
                    return [default_cat]
    return categories


def get_default_category(video_id: str) -> dict | None:
    cats = get_categories(video_id)
    if cats is None:
        return None
    return next((c for c in cats if c.get("is_default")), None)


def get_category(category_id: str) -> dict | None:
    for project in get_projects():
        for video in project.get("videos", []):
            for cat in video.get("categories", []):
                if cat["id"] == category_id:
                    return cat
    return None


def add_category(video_id: str, category_data: dict) -> dict | None:
    data = _load()
    for project in data["projects"]:
        for video in project.get("videos", []):
            if video["id"] == video_id:
                video.setdefault("categories", []).append(category_data)
                _save(data)
                return category_data
    return None


def update_category(category_id: str, **kwargs) -> dict | None:
    data = _load()
    for project in data["projects"]:
        for video in project.get("videos", []):
            for cat in video.get("categories", []):
                if cat["id"] == category_id:
                    cat.update({k: v for k, v in kwargs.items() if k in ("name", "color")})
                    _save(data)
                    return cat
    return None


def delete_category(category_id: str) -> bool:
    data = _load()
    for project in data["projects"]:
        for video in project.get("videos", []):
            categories = video.get("categories", [])
            for i, cat in enumerate(categories):
                if cat["id"] == category_id:
                    del categories[i]
                    _save(data)
                    return True
    return False


def delete_all_annotations(video_id: str) -> bool:
    data = _load()
    for project in data["projects"]:
        for video in project.get("videos", []):
            if video["id"] == video_id:
                video["annotations"] = []
                _save(data)
                return True
    return False


def bulk_add_annotations(video_id: str, annotations_data: list[dict]) -> list[dict] | None:
    """Ajoute plusieurs annotations en une seule écriture atomique."""
    data = _load()
    for project in data["projects"]:
        for video in project.get("videos", []):
            if video["id"] == video_id:
                video.setdefault("annotations", []).extend(annotations_data)
                _save(data)
                return annotations_data
    return None


def shift_video_annotations(video_id: str, offset_frames: int) -> list[dict] | None:
    """Décale toutes les annotations d'une vidéo (offset_frames déjà calculé).
    Retourne la liste mise à jour, ou None si vidéo introuvable."""
    data = _load()
    for project in data["projects"]:
        for video in project.get("videos", []):
            if video["id"] == video_id:
                fps = video["fps"]
                annotations = video.get("annotations", [])
                for ann in annotations:
                    new_frame = ann["frame_number"] + offset_frames
                    ann["frame_number"] = new_frame
                    ann["timestamp_ms"] = new_frame / fps * 1000
                    ann["updated_at"] = _now()
                _save(data)
                return annotations
    return None
