#!/usr/bin/env bash

set -uo pipefail

PROJECT_ID="${PROJECT_ID:-project-2f5d7375-d77f-44ae-b19}"
REGION="${REGION:-asia-south1}"
REPOSITORY="${REPOSITORY:-pikorua-crm-images}"
RELEASE_BUCKET="${RELEASE_BUCKET:-project-2f5d7375-d77f-44ae-b19-pikorua-crm-releases}"

BASE_COMPOSE="${BASE_COMPOSE:-/opt/pikorua-crm/compose.yaml}"
APP_COMPOSE="${APP_COMPOSE:-/opt/pikorua-crm/compose.app.yaml}"
STATE_DIR="${STATE_DIR:-/opt/pikorua-crm/config/deploy}"
CURRENT_RELEASE_FILE="${CURRENT_RELEASE_FILE:-${STATE_DIR}/current-release}"
LOCK_FILE="${LOCK_FILE:-/run/lock/pikorua-crm-deploy.lock}"

IMAGE_ROOT="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}"
MANIFEST_URI="gs://${RELEASE_BUCKET}/releases/production.env"

log() {
  logger -t pikorua-crm-deploy -- "$*"
  printf '%s\n' "$*"
}

fail() {
  log "ERROR: $*"
  exit 1
}

read_manifest_value() {
  local key="$1"
  local file="$2"
  sed -n "s/^${key}=//p" "$file" | head -n 1
}

wait_for_healthy() {
  local container="$1"
  local attempts="${2:-45}"
  local status=""

  for ((attempt = 1; attempt <= attempts; attempt += 1)); do
    status="$(docker inspect \
      --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
      "$container" 2>/dev/null || true)"

    case "$status" in
      healthy|running)
        return 0
        ;;
      unhealthy|exited|dead)
        return 1
        ;;
    esac

    sleep 2
  done

  return 1
}

registry_login() {
  local registry="https://${REGION}-docker.pkg.dev"

  if gcloud auth print-access-token 2>/dev/null | docker login \
    --username oauth2accesstoken \
    --password-stdin \
    "$registry" >/dev/null 2>&1; then
    return 0
  fi

  command -v curl >/dev/null 2>&1 || return 1

  local token_response access_token
  token_response="$(curl -fsS \
    -H 'Metadata-Flavor: Google' \
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token' \
    2>/dev/null)" || return 1

  access_token="$(printf '%s' "$token_response" | sed -n \
    's/.*"access_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
  [[ -n "$access_token" ]] || return 1

  printf '%s' "$access_token" | docker login \
    --username oauth2accesstoken \
    --password-stdin \
    "$registry" >/dev/null 2>&1
}

rollback() {
  local backup="$1"

  log "Rolling back Compose image references"
  cp --preserve=mode,ownership "$backup" "$APP_COMPOSE"

  docker compose -f "$BASE_COMPOSE" -f "$APP_COMPOSE" pull api web || true
  docker compose -f "$BASE_COMPOSE" -f "$APP_COMPOSE" \
    up -d --no-deps --force-recreate api web || true

  wait_for_healthy pikorua-crm-api 45 || true
  wait_for_healthy pikorua-crm-web 45 || true
}

main() {
  command -v gcloud >/dev/null 2>&1 || fail "gcloud is not installed"
  command -v docker >/dev/null 2>&1 || fail "docker is not installed"
  command -v flock >/dev/null 2>&1 || fail "flock is not installed"

  mkdir -p "$STATE_DIR"
  chmod 750 "$STATE_DIR"

  exec 9>"$LOCK_FILE"
  flock -n 9 || {
    log "Another deployment check is already running"
    exit 0
  }

  local manifest
  manifest="$(mktemp)"
  trap 'rm -f "${manifest:-}"' EXIT

  if ! gcloud storage cp "$MANIFEST_URI" "$manifest" >/dev/null 2>&1; then
    fail "Unable to download release manifest"
  fi

  local release_sha api_image web_image
  release_sha="$(read_manifest_value RELEASE_SHA "$manifest")"
  api_image="$(read_manifest_value API_IMAGE "$manifest")"
  web_image="$(read_manifest_value WEB_IMAGE "$manifest")"

  [[ "$release_sha" =~ ^[0-9a-f]{40}$ ]] || fail "Invalid release SHA"
  [[ "$api_image" =~ ^${IMAGE_ROOT}/pikorua-crm-api@sha256:[0-9a-f]{64}$ ]] || \
    fail "Invalid API image reference"
  [[ "$web_image" =~ ^${IMAGE_ROOT}/pikorua-crm-web@sha256:[0-9a-f]{64}$ ]] || \
    fail "Invalid web image reference"

  local current_release=""
  if [[ -f "$CURRENT_RELEASE_FILE" ]]; then
    current_release="$(tr -d '[:space:]' < "$CURRENT_RELEASE_FILE")"
  fi

  if [[ "$current_release" == "$release_sha" ]]; then
    log "Release ${release_sha} is already deployed"
    exit 0
  fi

  if [[ "${1:-}" == "--check" ]]; then
    log "Release ${release_sha} is ready to deploy"
    exit 0
  fi

  log "Deploying release ${release_sha}"

  if ! registry_login; then
    fail "Artifact Registry authentication failed"
  fi

  local backup
  backup="${STATE_DIR}/compose.app.before-${release_sha}.yaml"
  cp --preserve=mode,ownership "$APP_COMPOSE" "$backup"

  sed -E -i \
    "s#${IMAGE_ROOT}/pikorua-crm-api@sha256:[0-9a-f]{64}#${api_image}#" \
    "$APP_COMPOSE"
  sed -E -i \
    "s#${IMAGE_ROOT}/pikorua-crm-web@sha256:[0-9a-f]{64}#${web_image}#" \
    "$APP_COMPOSE"

  grep -Fq "$api_image" "$APP_COMPOSE" || {
    rollback "$backup"
    fail "API image reference was not updated"
  }
  grep -Fq "$web_image" "$APP_COMPOSE" || {
    rollback "$backup"
    fail "Web image reference was not updated"
  }

  if ! docker compose -f "$BASE_COMPOSE" -f "$APP_COMPOSE" config --quiet; then
    rollback "$backup"
    fail "Updated Compose configuration is invalid"
  fi

  if ! docker compose -f "$BASE_COMPOSE" -f "$APP_COMPOSE" pull api web; then
    rollback "$backup"
    fail "Unable to pull release images"
  fi

  if ! docker compose -f "$BASE_COMPOSE" -f "$APP_COMPOSE" \
    up -d --no-deps --force-recreate api; then
    rollback "$backup"
    fail "API container recreation failed"
  fi

  if ! wait_for_healthy pikorua-crm-api 45; then
    docker logs --tail 100 pikorua-crm-api 2>&1 | logger -t pikorua-crm-deploy || true
    rollback "$backup"
    fail "API health check failed"
  fi

  if ! docker compose -f "$BASE_COMPOSE" -f "$APP_COMPOSE" \
    up -d --no-deps --force-recreate web; then
    rollback "$backup"
    fail "Web container recreation failed"
  fi

  if ! wait_for_healthy pikorua-crm-web 45; then
    docker logs --tail 100 pikorua-crm-web 2>&1 | logger -t pikorua-crm-deploy || true
    rollback "$backup"
    fail "Web health check failed"
  fi

  printf '%s\n' "$release_sha" > "$CURRENT_RELEASE_FILE"
  chmod 640 "$CURRENT_RELEASE_FILE"

  docker image prune -f --filter 'until=168h' >/dev/null 2>&1 || true
  log "Release ${release_sha} deployed successfully"
}

main "$@"
