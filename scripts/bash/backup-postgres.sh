#!/usr/bin/env bash
#
# Purpose: Take a logical backup of the products Postgres database from the running pod.
# Usage: bash scripts/bash/backup-postgres.sh [--namespace products] [--output-dir ./backups] [--keep 7]
# Example: bash scripts/bash/backup-postgres.sh --keep 7

set -euo pipefail

NAMESPACE="products"
OUTPUT_DIR="./backups"
KEEP="7"

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  GREEN=$'\033[32m'
  BLUE=$'\033[34m'
  RED=$'\033[31m'
  YELLOW=$'\033[33m'
  RESET=$'\033[0m'
else
  GREEN=""
  BLUE=""
  RED=""
  YELLOW=""
  RESET=""
fi

usage() {
  sed -n '2,5p' "$0" | sed 's/^# \{0,1\}//'
  cat <<'EOF'

Options:
  --namespace NAME   Kubernetes namespace (default: products)
  --output-dir DIR   Directory for .sql backups (default: ./backups)
  --keep COUNT       Number of latest backups to keep (default: 7)
  -h, --help         Show this help message
EOF
}

info() { printf '%s==>%s %s\n' "$BLUE" "$RESET" "$*"; }
ok() { printf '%sPASS%s %s\n' "$GREEN" "$RESET" "$*"; }
warn() { printf '%sWARN%s %s\n' "$YELLOW" "$RESET" "$*"; }
die() { printf '%sERROR%s %s\n' "$RED" "$RESET" "$*" >&2; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

file_size() {
  if command -v du >/dev/null 2>&1; then
    du -h "$1" | awk '{print $1}'
  else
    wc -c < "$1"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --namespace)
      NAMESPACE="${2:-}"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="${2:-}"
      shift 2
      ;;
    --keep)
      KEEP="${2:-}"
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
[[ "$KEEP" =~ ^[0-9]+$ ]] || die "--keep must be a non-negative integer"

info "Detecting Postgres pod in namespace ${NAMESPACE}"
pod="$(kubectl get pod -n "$NAMESPACE" -l app=postgres -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)"
[[ -n "$pod" ]] || die "No Postgres pod found with label app=postgres in namespace ${NAMESPACE}"

mkdir -p "$OUTPUT_DIR"
timestamp="$(date +%Y-%m-%d_%H%M%S)"
backup_file="${OUTPUT_DIR%/}/products_${timestamp}.sql"

info "Writing backup to ${backup_file}"
if kubectl exec -n "$NAMESPACE" "$pod" -- sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > "$backup_file"; then
  ok "backup completed: ${backup_file} ($(file_size "$backup_file"))"
else
  rm -f "$backup_file"
  die "pg_dump failed; removed partial backup"
fi

if [[ "$KEEP" -gt 0 ]]; then
  mapfile -t old_backups < <(ls -1t "${OUTPUT_DIR%/}"/products_*.sql 2>/dev/null | sed -n "$((KEEP + 1)),\$p")
  for old_backup in "${old_backups[@]}"; do
    rm -f "$old_backup"
    warn "deleted old backup: ${old_backup}"
  done
fi
