# Installation et démarrage

Ce document décrit deux modes d'utilisation :

1. **Mode production locale** (Docker Compose) — la voie standard pour utiliser l'application.
2. **Mode développement** (services lancés à la main) — pour modifier le code, écrire des tests, etc.

---

## 1. Pré-requis

| Outil          | Version minimale | Vérification        |
|----------------|------------------|---------------------|
| Docker         | 24.x             | `docker --version`  |
| Docker Compose | v2 (intégré)     | `docker compose version` |
| Git            | 2.30+            | `git --version`     |

**Pour le mode développement uniquement :**

| Outil   | Version   | Notes                                              |
|---------|-----------|----------------------------------------------------|
| Python  | 3.11      | Backend FastAPI                                    |
| Node.js | 20 LTS    | Frontend Vite + suite E2E Playwright                |
| FFmpeg  | 6.x       | Métadonnées vidéo + découpe export                  |
| npm     | 10.x      | Fourni avec Node 20                                |

---

## 2. Configuration

Copier le modèle d'environnement à la racine du dépôt :

```bash
cp .env.example .env
```

Variables disponibles :

| Variable             | Valeur par défaut                     | Rôle                                                |
|----------------------|---------------------------------------|-----------------------------------------------------|
| `DATA_DIR`           | `/data`                               | Répertoire du JSON store (`projects.json`)          |
| `VIDEOS_DIR`         | `/videos`                             | Répertoire des fichiers vidéo importés              |
| `ALLOWED_ORIGINS`    | `http://localhost:3000`               | Origines CORS autorisées (séparées par `,`)         |
| `MAX_VIDEO_SIZE_MB`  | `2000`                                | Taille maximale d'upload (en Mo)                    |
| `TEMP_DIR`           | `/tmp/annotations_exports`            | Dossier temporaire pour les exports vidéo           |
| `VITE_API_URL`       | `http://localhost:8000/api/v1`        | URL API consommée par le frontend (build-time)      |

> En mode Docker Compose, les chemins `/data` et `/videos` pointent vers des volumes Docker nommés (`json_data`, `videos_data`) — vos données survivent à un `docker compose down`, mais pas à `docker compose down -v`.

---

## 3. Démarrage en mode production locale

```bash
docker compose up --build
```

Services exposés :

| Service   | URL                                | Description                          |
|-----------|------------------------------------|--------------------------------------|
| Frontend  | http://localhost:3000              | SPA React servie par Nginx           |
| API       | http://localhost:8000/api/v1       | API REST FastAPI                     |
| Swagger   | http://localhost:8000/docs         | Documentation OpenAPI interactive    |
| ReDoc     | http://localhost:8000/redoc        | Documentation OpenAPI alternative    |
| Health    | http://localhost:8000/api/v1/health| Sonde de santé (renvoie `{status:"ok"}`) |

**Vérification :**

```bash
curl http://localhost:8000/api/v1/health
# {"status":"ok"}
```

**Arrêt :**

```bash
docker compose down       # Arrêt sans perte de données
docker compose down -v    # Arrêt + suppression des volumes (RAZ complète)
```

---

## 4. Mode développement (hot reload)

Le backend et le frontend sont lancés séparément pour bénéficier du rechargement à chaud.

### 4.1 Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

export DATA_DIR=$PWD/.data
export VIDEOS_DIR=$PWD/.videos
export ALLOWED_ORIGINS=http://localhost:3000
mkdir -p "$DATA_DIR" "$VIDEOS_DIR"

uvicorn app.main:app --reload --port 8000
```

### 4.2 Frontend

```bash
cd frontend
npm ci
VITE_API_URL=http://localhost:8000/api/v1 npm run dev
```

Le serveur Vite écoute sur http://localhost:3000 et recharge automatiquement à chaque changement de fichier.

### 4.3 FFmpeg

FFmpeg doit être disponible sur le `PATH` du backend. Sous Debian/Ubuntu :

```bash
sudo apt-get update && sudo apt-get install -y ffmpeg
ffmpeg -version
```

---

## 5. Premier test fonctionnel

1. Ouvrir http://localhost:3000
2. **Nouveau projet** → saisir un nom → **Créer**
3. Cliquer sur le projet → **Importer une vidéo** (mp4, mov, avi, mkv…)
4. Attendre la fin de l'analyse FFmpeg (durée, fps, codec extraits automatiquement)
5. Cliquer sur la vidéo → page **Annotation**
6. Lire la vidéo, appuyer sur **Espace** pour poser une annotation
7. Onglet **Statistiques** → constater le BPM calculé

---

## 6. Problèmes fréquents

| Symptôme                                       | Cause probable                              | Solution                                              |
|------------------------------------------------|---------------------------------------------|-------------------------------------------------------|
| `docker compose up` → port 3000 already in use | Un autre process utilise le port            | `lsof -i :3000` puis libérer le port, ou modifier le mapping dans `docker-compose.yml` |
| Upload vidéo refusé                            | Fichier > `MAX_VIDEO_SIZE_MB`               | Augmenter la limite dans `.env` puis relancer le backend |
| Frontend affiche "Network error"               | Backend non démarré ou URL incorrecte       | Vérifier `VITE_API_URL` (build) et que le backend répond sur `/health` |
| `ffmpeg: command not found` côté backend       | FFmpeg absent du conteneur ou du venv       | En Docker il est installé via le Dockerfile ; en venv : `apt install ffmpeg` |
| Annotations non persistées                     | Volume `json_data` supprimé                 | Éviter `docker compose down -v` si on veut conserver les données |

---

## 7. Mise à jour

```bash
git pull
docker compose build
docker compose up -d
```

En mode dev, après un `git pull` :

```bash
# Backend
cd backend && pip install -r requirements.txt
# Frontend
cd frontend && npm ci
```
