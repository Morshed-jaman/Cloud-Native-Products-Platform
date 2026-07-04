#!/usr/bin/env bash
#
# Purpose: Tail combined logs from backend, frontend, Postgres, and Redis pods.
# Usage: bash scripts/bash/tail-logs.sh [--namespace products] [--since 5m]
# Example: bash scripts/bash/tail-logs.sh --since 10m

set -euo pipefail

NAMESPACE="products"
SINCE="5m"
PIDS=()

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  BLUE=$'\033[34m'
  RED=$'\033[31m'
  RESET=$'\033[0m'
else
  BLUE=""
  RED=""
  RESET=""
fi

usage() {
  sed -n '2,5p' "$0" | sed 's/^# \{0,1\}//'
  cat <<'EOF'

Options:
  --namespace NAME   Kubernetes namespace (default: products)
  --since DURATION   Show logs newer than duration (default: 5m)
  -h, --help         Show this help message
EOF
}

info() { printf '%s==>%s %s\n' "$BLUE" "$RESET" "$*"; }
die() { printf '%sERROR%s %s\n' "$RED" "$RESET" "$*" >&2; exit 1; }

cleanup() {
  if [[ "${#PIDS[@]}" -gt 0 ]]; then
    for pid in "${PIDS[@]}"; do
      kill "$pid" >/dev/null 2>&1 || true
    done
  fi
}

trap cleanup INT TERM EXIT

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --namespace)
      NAMESPACE="${2:-}"
      shift 2
      ;;
    --since)
      SINCE="${2:-}"
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

need_cmd kubectl
kubectl get namespace "$NAMESPACE" >/dev/null

tail_component() {
  local component="$1"
  local selector="app=${component}"

  (
    kubectl logs -n "$NAMESPACE" -l "$selector" --all-containers=true --since="$SINCE" --prefix=true -f 2>&1 |
      sed "s/^/[${component}] /"
  ) &
  PIDS+=("$!")
}

info "Tailing logs from backend, frontend, postgres, and redis in namespace ${NAMESPACE}"
info "Press Ctrl-C to stop"

tail_component backend
tail_component frontend
tail_component postgres
tail_component redis

wait
