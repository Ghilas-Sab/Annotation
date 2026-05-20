#!/usr/bin/env bash
# Lance les tests E2E Playwright dans Docker Compose.
# Usage : ./e2e/run-e2e.sh [playwright args]
# Exemple : ./e2e/run-e2e.sh --grep "projets"

set -euo pipefail

COMPOSE_FILE="$(cd "$(dirname "$0")/.." && pwd)/docker-compose.e2e.yml"

echo "==> Construction des images..."
docker compose -f "$COMPOSE_FILE" build

echo "==> Lancement des services et des tests..."
docker compose -f "$COMPOSE_FILE" up \
  --exit-code-from playwright \
  --abort-on-container-exit \
  "$@"

EXIT_CODE=$?

echo "==> Nettoyage des containers..."
docker compose -f "$COMPOSE_FILE" down -v

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "✓ Tous les tests E2E sont passés."
else
  echo "✗ Des tests E2E ont échoué (exit code $EXIT_CODE)."
  echo "  Voir le rapport HTML dans e2e/playwright-report/"
fi

exit "$EXIT_CODE"
