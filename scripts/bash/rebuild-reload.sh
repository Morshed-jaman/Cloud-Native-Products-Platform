#!/usr/bin/env bash
#
# Purpose: Rebuild backend and frontend images, push to the local registry, and restart deployments.
# Usage: bash scripts/bash/rebuild-reload.sh [--tag local] [--namespace products] [--registry localhost:5001]
# Example: bash scripts/bash/rebuild-reload.sh --tag local

set -euo pipefail

TAG="local"
NAMESPACE="products"
REGISTRY="localhost:5001"
VITE_API_URL="${VITE_API_URL:-http://localhost:8081}"
ROLLOUT_TIMEOUT="${ROLLOUT_TIMEOUT:-180s}"

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  GREEN=$'\033[32m'
  BLUE=$'\033[34m'
  RED=$'\033[31m'
  RESET=$'\033[0m'
else
  GREEN=""
  BLUE=""
  RED=""
  RESET=""
fi

usage() {
  sed -n '2,5p' "$0" | sed 's/^# \{0,1\}//'
  cat <<'EOF'

Options:
  --tag TAG          Image tag to build and deploy (default: local)
  --namespace NAME   Kubernetes namespace (default: products)
  --registry HOST    Local registry (default: localhost:5001)
  -h, --help         Show this help message
EOF
}

info() { printf '%s==>%s %s\n' "$BLUE" "$RESET" "$*"; }
ok() { printf '%sPASS%s %s\n' "$GREEN" "$RESET" "$*"; }
die() { printf '%sERROR%s %s\n' "$RED" "$RESET" "$*" >&2; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag|-t)
      TAG="${2:-}"
      shift 2
      ;;
    --namespace)
      NAMESPACE="${2:-}"
      shift 2
      ;;
    --registry)
      REGISTRY="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

need_cmd docker
need_cmd kubectl

[[ -n "$TAG" ]] || die "--tag must not be empty"
[[ -n "$NAMESPACE" ]] || die "--namespace must not be empty"
[[ -n "$REGISTRY" ]] || die "--registry must not be empty"

start_time="$(date +%s)"

info "Checking cluster namespace ${NAMESPACE}"
kubectl get namespace "$NAMESPACE" >/dev/null

info "Building backend image products-backend:${TAG}"
docker build --platform=linux/amd64 -t "products-backend:${TAG}" ./backend
docker tag "products-backend:${TAG}" "${REGISTRY}/products-backend:${TAG}"

info "Building frontend image products-frontend:${TAG}"
docker build --platform=linux/amd64 --build-arg "VITE_API_URL=${VITE_API_URL}" -t "products-frontend:${TAG}" ./frontend
docker tag "products-frontend:${TAG}" "${REGISTRY}/products-frontend:${TAG}"

info "Pushing images to ${REGISTRY}"
docker push "${REGISTRY}/products-backend:${TAG}"
docker push "${REGISTRY}/products-frontend:${TAG}"

info "Restarting backend and frontend deployments"
kubectl rollout restart deployment/backend deployment/frontend -n "$NAMESPACE"
kubectl rollout status deployment/backend -n "$NAMESPACE" --timeout="$ROLLOUT_TIMEOUT"
kubectl rollout status deployment/frontend -n "$NAMESPACE" --timeout="$ROLLOUT_TIMEOUT"

elapsed="$(( $(date +%s) - start_time ))"
ok "rebuild, push, and rollout completed in ${elapsed}s"
