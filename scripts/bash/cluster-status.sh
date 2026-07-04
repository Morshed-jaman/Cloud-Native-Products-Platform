#!/usr/bin/env bash
#
# Purpose: One-shot health snapshot of the local kind products cluster.
# Usage: bash scripts/bash/cluster-status.sh [--namespace products] [--backend-url http://localhost:8081] [--frontend-url http://localhost:8080]
# Example: bash scripts/bash/cluster-status.sh --namespace products

set -euo pipefail

NAMESPACE="products"
BACKEND_URL="http://localhost:8081"
FRONTEND_URL="http://localhost:8080"

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  RED=$'\033[31m'
  GREEN=$'\033[32m'
  YELLOW=$'\033[33m'
  BLUE=$'\033[34m'
  RESET=$'\033[0m'
else
  RED=""
  GREEN=""
  YELLOW=""
  BLUE=""
  RESET=""
fi

PASS_COUNT=0
FAIL_COUNT=0

usage() {
  sed -n '2,5p' "$0" | sed 's/^# \{0,1\}//'
  cat <<'EOF'

Options:
  --namespace NAME       Kubernetes namespace to inspect (default: products)
  --backend-url URL      Backend base URL (default: http://localhost:8081)
  --frontend-url URL     Frontend URL (default: http://localhost:8080)
  -h, --help             Show this help message
EOF
}

info() { printf '%s==>%s %s\n' "$BLUE" "$RESET" "$*"; }
ok() { printf '%sPASS%s %s\n' "$GREEN" "$RESET" "$*"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { printf '%sFAIL%s %s\n' "$RED" "$RESET" "$*"; FAIL_COUNT=$((FAIL_COUNT + 1)); }
warn() { printf '%sWARN%s %s\n' "$YELLOW" "$RESET" "$*"; }

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "Required command not found: $1"
    return 1
  fi
}

pretty_json() {
  if command -v py >/dev/null 2>&1 && printf '{}' | py -3 -m json.tool >/dev/null 2>&1; then
    py -3 -m json.tool
  elif command -v python3 >/dev/null 2>&1 && printf '{}' | python3 -m json.tool >/dev/null 2>&1; then
    python3 -m json.tool
  elif command -v python >/dev/null 2>&1 && printf '{}' | python -m json.tool >/dev/null 2>&1; then
    python -m json.tool
  else
    cat
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --namespace)
      NAMESPACE="${2:-}"
      shift 2
      ;;
    --backend-url)
      BACKEND_URL="${2:-}"
      shift 2
      ;;
    --frontend-url)
      FRONTEND_URL="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown argument: %s\n' "$1" >&2
      usage >&2
      exit 64
      ;;
  esac
done

need_cmd kubectl || exit 127
need_cmd curl || exit 127

info "Cluster info"
if kubectl cluster-info; then
  ok "kubectl cluster-info succeeded"
else
  fail "kubectl cluster-info failed"
fi

info "Pods in namespace ${NAMESPACE}"
if kubectl get pods -n "$NAMESPACE"; then
  ok "listed pods"
else
  fail "could not list pods in namespace ${NAMESPACE}"
fi

info "Services and NodePorts in namespace ${NAMESPACE}"
if kubectl get svc -n "$NAMESPACE" -o wide; then
  ok "listed services"
else
  fail "could not list services in namespace ${NAMESPACE}"
fi

info "Backend health"
backend_health_url="${BACKEND_URL%/}/health"
backend_body=""
if backend_body="$(curl -fsS --max-time 5 "$backend_health_url")"; then
  printf '%s\n' "$backend_body" | pretty_json || printf '%s\n' "$backend_body"
  if printf '%s' "$backend_body" | grep -q '"status"[[:space:]]*:[[:space:]]*"ok"'; then
    ok "backend health is ok"
  else
    fail "backend health did not report status=ok"
  fi
else
  fail "backend health request failed: ${backend_health_url}"
fi

info "Frontend HTTP status"
frontend_status="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "$FRONTEND_URL" || true)"
if [[ "$frontend_status" =~ ^[23] ]]; then
  ok "frontend returned HTTP ${frontend_status}"
else
  fail "frontend returned HTTP ${frontend_status:-unreachable}"
fi

printf '\n%sSummary:%s %s pass, %s fail\n' "$BLUE" "$RESET" "$PASS_COUNT" "$FAIL_COUNT"

if [[ "$FAIL_COUNT" -eq 0 ]]; then
  exit 0
fi

exit 1
