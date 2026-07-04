# Ops Automation Scripts

This folder contains lightweight operations scripts for the local Products
platform. Bash scripts live in `scripts/bash`; Python scripts live in
`scripts/python`.

## How to Run on Windows

- Bash scripts: run from Git Bash or WSL.
- Python scripts: run with `py -3 <script>.py` from PowerShell.
- Python dependencies:

```powershell
py -3 -m pip install -r scripts/python/requirements.txt
```

The Kubernetes scripts expect `kubectl` to point at the local kind cluster and
the app to run in the `products` namespace. Docker scripts expect Docker Desktop
and the local registry at `localhost:5001`.

## Bash Scripts

### `scripts/bash/cluster-status.sh`

One-shot health snapshot of the local kind cluster.

```bash
bash scripts/bash/cluster-status.sh
bash scripts/bash/cluster-status.sh --namespace products --backend-url http://localhost:8081 --frontend-url http://localhost:8080
```

Requirements: `kubectl`, `curl`, optional `python3` or `python` for JSON pretty
printing.

### `scripts/bash/rebuild-reload.sh`

Rebuild backend and frontend images, push them to the local registry, and
restart the Kubernetes deployments.

```bash
bash scripts/bash/rebuild-reload.sh
bash scripts/bash/rebuild-reload.sh --tag local
```

Requirements: `docker`, `kubectl`, local registry `localhost:5001`, and a running
kind cluster.

### `scripts/bash/backup-postgres.sh`

Create a logical SQL backup from the running Postgres pod and keep only the last
seven backups by default.

```bash
bash scripts/bash/backup-postgres.sh
bash scripts/bash/backup-postgres.sh --output-dir ./backups --keep 7
```

Requirements: `kubectl` and a running Postgres pod with label `app=postgres`.
The script uses database environment variables already present in the pod.

### `scripts/bash/tail-logs.sh`

Tail combined logs from backend, frontend, Postgres, and Redis.

```bash
bash scripts/bash/tail-logs.sh
bash scripts/bash/tail-logs.sh --since 10m
```

Requirements: `kubectl`.

## Python Scripts

### `scripts/python/health_check.py`

Nagios-style health check for the running app.

```powershell
py -3 scripts/python/health_check.py
py -3 scripts/python/health_check.py --backend-url http://localhost:8081 --frontend-url http://localhost:8080 --timeout 5
```

Exit codes: `0` for OK, `2` for CRITICAL.

### `scripts/python/image_vuln_report.py`

Run Trivy against local images and generate a Markdown vulnerability report.

```powershell
py -3 scripts/python/image_vuln_report.py --image products-backend:local
py -3 scripts/python/image_vuln_report.py --image products-backend:local --image products-frontend:local --output ./reports/vuln-report.md
```

Requirements: `trivy` on `PATH`. The script exits non-zero when findings at or
above `--fail-on` are present. The default is `CRITICAL`.

### `scripts/python/k8s_resource_report.py`

Generate a Markdown report of nodes, pod counts, pod resource requests and
limits, PVCs, services, totals, and warnings.

```powershell
py -3 scripts/python/k8s_resource_report.py
py -3 scripts/python/k8s_resource_report.py --namespace products --output ./reports/cluster-report.md
```

Requirements: `kubectl`.

### `scripts/python/smoke_test.py`

End-to-end functional smoke test of the Products backend API.

```powershell
py -3 scripts/python/smoke_test.py
py -3 scripts/python/smoke_test.py --backend-url http://localhost:4000
```

The smoke test creates a uniquely named product, verifies read/update/delete
behavior, and confirms the deleted product returns `404`.
