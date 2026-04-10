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
