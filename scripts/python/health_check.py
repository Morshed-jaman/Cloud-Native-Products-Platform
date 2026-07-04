#!/usr/bin/env python3
#
# Purpose: Nagios-style health check for the running Products app.
# Usage: py -3 scripts/python/health_check.py [--backend-url http://localhost:8081] [--frontend-url http://localhost:8080]
# Example: py -3 scripts/python/health_check.py --timeout 5

from __future__ import annotations

import argparse
import sys
from typing import Any
from urllib.parse import urljoin

import requests


OK = 0
CRITICAL = 2


class Colors:
    def __init__(self) -> None:
        enabled = sys.stdout.isatty()
        self.green = "\033[32m" if enabled else ""
        self.red = "\033[31m" if enabled else ""
        self.reset = "\033[0m" if enabled else ""


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Nagios-style health check for backend and frontend endpoints."
    )
    parser.add_argument("--backend-url", default="http://localhost:8081", help="Backend base URL.")
    parser.add_argument("--frontend-url", default="http://localhost:8080", help="Frontend URL.")
    parser.add_argument("--timeout", type=float, default=5.0, help="HTTP timeout in seconds.")
    return parser


def backend_health_url(base_url: str) -> str:
    clean = base_url.rstrip("/") + "/"
    return urljoin(clean, "health")


def check_backend(url: str, timeout: float) -> tuple[bool, str]:
    response = requests.get(backend_health_url(url), timeout=timeout)
    response.raise_for_status()
    payload: dict[str, Any] = response.json()

    expected = {
        "status": "ok",
        "postgres": True,
        "redis": True,
    }
    failures = [
        f"{key}={payload.get(key)!r}"
        for key, expected_value in expected.items()
        if payload.get(key) != expected_value
    ]

    if failures:
        return False, "backend health mismatch: " + ", ".join(failures)

    return True, "backend status=ok postgres=true redis=true"


def check_frontend(url: str, timeout: float) -> tuple[bool, str]:
    response = requests.get(url, timeout=timeout)
    if 200 <= response.status_code < 400:
        return True, f"frontend HTTP {response.status_code}"
    return False, f"frontend HTTP {response.status_code}"


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    colors = Colors()

    try:
        backend_ok, backend_message = check_backend(args.backend_url, args.timeout)
        frontend_ok, frontend_message = check_frontend(args.frontend_url, args.timeout)
    except requests.RequestException as exc:
        print(f"{colors.red}CRITICAL:{colors.reset} request failed: {exc}")
        return CRITICAL
    except ValueError as exc:
        print(f"{colors.red}CRITICAL:{colors.reset} invalid backend JSON: {exc}")
        return CRITICAL

    if backend_ok and frontend_ok:
        print(f"{colors.green}OK:{colors.reset} {backend_message}; {frontend_message}")
        return OK

    messages = [message for ok, message in [(backend_ok, backend_message), (frontend_ok, frontend_message)] if not ok]
    print(f"{colors.red}CRITICAL:{colors.reset} {'; '.join(messages)}")
    return CRITICAL


if __name__ == "__main__":
    sys.exit(main())
