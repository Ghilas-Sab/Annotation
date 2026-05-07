import pytest
from app.storage import json_store


def test_load_empty_returns_default(data_dir):
    data = json_store._load()
    assert data == {"projects": []}


def test_create_project(data_dir):
    p = json_store.create_project("Mon projet", "description")
    assert p["name"] == "Mon projet"
    assert "id" in p
    assert "created_at" in p


def test_get_projects(data_dir):
    json_store.create_project("P1")
    json_store.create_project("P2")
    projects = json_store.get_projects()
    assert len(projects) == 2


def test_get_project(data_dir):
    p = json_store.create_project("Projet")
    found = json_store.get_project(p["id"])
    assert found is not None
    assert found["id"] == p["id"]


def test_get_project_not_found(data_dir):
    assert json_store.get_project("inexistant") is None


def test_update_project(data_dir):
    p = json_store.create_project("Ancien nom")
    updated = json_store.update_project(p["id"], name="Nouveau nom")
    assert updated["name"] == "Nouveau nom"


def test_delete_project(data_dir):
    p = json_store.create_project("A supprimer")
    result = json_store.delete_project(p["id"])
    assert result is True
    assert json_store.get_project(p["id"]) is None


def test_delete_project_not_found(data_dir):
    assert json_store.delete_project("inexistant") is False


def test_save_is_atomic(data_dir):
    """Le fichier .tmp ne doit pas subsister après une écriture."""
    json_store.create_project("Test atomicité")
    tmp = data_dir / "projects.tmp"
    assert not tmp.exists()


def test_update_project_not_found(data_dir):
    """update_project retourne None si le projet est introuvable."""
    result = json_store.update_project("nonexistent-id", name="Nouveau")
    assert result is None


def test_add_video_to_project_not_found(data_dir):
    """add_video_to_project retourne None si le projet est introuvable."""
    result = json_store.add_video_to_project("nonexistent-id", {"id": "v1", "filename": "f.mp4"})
    assert result is None


def test_update_video_not_found(data_dir):
    """update_video retourne None si la vidéo est introuvable."""
    result = json_store.update_video("nonexistent-vid", original_name="new_name")
    assert result is None


def test_update_video_allowed_fields(data_dir):
    """update_video ne met à jour que original_name et adapted_preview."""
    p = json_store.create_project("Test proj")
    vid = {
        "id": "vid-1",
        "filename": "f.mp4",
        "original_name": "old_name",
        "annotations": [],
    }
    json_store.add_video_to_project(p["id"], vid)
    updated = json_store.update_video("vid-1", original_name="new_name")
    assert updated["original_name"] == "new_name"


def test_delete_video_not_found(data_dir):
    """delete_video retourne False si la vidéo est introuvable."""
    assert json_store.delete_video("nonexistent-vid") is False


def test_delete_video_found(data_dir):
    """delete_video retourne True si la vidéo existe."""
    p = json_store.create_project("Proj")
    vid = {"id": "vid-2", "filename": "g.mp4", "annotations": []}
    json_store.add_video_to_project(p["id"], vid)
    result = json_store.delete_video("vid-2")
    assert result is True
    assert json_store.get_video("vid-2") is None


def test_add_annotation_not_found(data_dir):
    """add_annotation retourne None si la vidéo est introuvable."""
    result = json_store.add_annotation("nonexistent-vid", {"id": "a1", "frame_number": 0})
    assert result is None


def test_update_annotation_not_found(data_dir):
    """update_annotation retourne None si l'annotation est introuvable."""
    result = json_store.update_annotation("nonexistent-ann", frame_number=5)
    assert result is None


def test_delete_annotation_not_found(data_dir):
    """delete_annotation retourne False si l'annotation est introuvable."""
    assert json_store.delete_annotation("nonexistent-ann") is False


def test_get_categories_lazy_migration(data_dir):
    """get_categories crée la catégorie par défaut si aucune catégorie n'existe."""
    p = json_store.create_project("Proj")
    # Créer une vidéo sans catégorie (simule ancien format)
    vid = {"id": "vid-cat", "filename": "v.mp4", "annotations": [], "categories": []}
    json_store.add_video_to_project(p["id"], vid)
    # Forcer la vidéo sans catégorie en écrivant directement
    data = json_store._load()
    for proj in data["projects"]:
        for v in proj.get("videos", []):
            if v["id"] == "vid-cat":
                v["categories"] = []
    json_store._save(data)
    cats = json_store.get_categories("vid-cat")
    assert cats is not None
    assert len(cats) == 1
    assert cats[0]["is_default"] is True


def test_get_default_category_not_found(data_dir):
    """get_default_category retourne None si vidéo introuvable."""
    result = json_store.get_default_category("nonexistent-vid")
    assert result is None


def test_update_category_not_found(data_dir):
    """update_category retourne None si catégorie introuvable."""
    result = json_store.update_category("nonexistent-cat", name="New")
    assert result is None


def test_delete_category_not_found(data_dir):
    """delete_category retourne False si catégorie introuvable."""
    assert json_store.delete_category("nonexistent-cat") is False


def test_delete_all_annotations_not_found(data_dir):
    """delete_all_annotations retourne False si vidéo introuvable."""
    assert json_store.delete_all_annotations("nonexistent-vid") is False


def test_bulk_add_annotations_not_found(data_dir):
    """bulk_add_annotations retourne None si vidéo introuvable."""
    result = json_store.bulk_add_annotations("nonexistent-vid", [{"id": "a1"}])
    assert result is None


def test_shift_video_annotations_not_found(data_dir):
    """shift_video_annotations retourne None si vidéo introuvable."""
    result = json_store.shift_video_annotations("nonexistent-vid", 5)
    assert result is None


def test_add_category_video_not_found(data_dir):
    """add_category retourne None si la vidéo est introuvable."""
    result = json_store.add_category("nonexistent-vid", {"id": "cat-1", "name": "Test"})
    assert result is None


def test_get_category_not_found(data_dir):
    """get_category retourne None si la catégorie est introuvable."""
    result = json_store.get_category("nonexistent-cat-id")
    assert result is None
