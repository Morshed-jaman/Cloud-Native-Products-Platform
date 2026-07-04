#!/usr/bin/env python3
#
# Purpose: End-to-end functional smoke test for the Products backend API.
# Usage: py -3 scripts/python/smoke_test.py [--backend-url http://localhost:8081] [--timeout 5]
# Example: py -3 scripts/python/smoke_test.py --backend-url http://localhost:4000

from __future__ import annotations

import argparse
import sys
import time
import uuid
from typing import Any, Callable

import requests


class Colors:
    def __init__(self) -> None:
        enabled = sys.stdout.isatty()
        self.green = "\033[32m" if enabled else ""
        self.red = "\033[31m" if enabled else ""
        self.blue = "\033[34m" if enabled else ""
        self.reset = "\033[0m" if enabled else ""


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run an end-to-end Products API smoke test.")
    parser.add_argument("--backend-url", default="http://localhost:8081", help="Backend base URL.")
    parser.add_argument("--timeout", type=float, default=5.0, help="HTTP timeout in seconds.")
    return parser


def api_url(base_url: str, path: str) -> str:
    return base_url.rstrip("/") + path


def assert_condition(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def run_step(colors: Colors, name: str, fn: Callable[[], None]) -> bool:
    print(f"{colors.blue}==>{colors.reset} {name}")
    try:
        fn()
    except Exception as exc:  # noqa: BLE001 - command-line smoke test prints any failure.
        print(f"{colors.red}FAIL:{colors.reset} {name}: {exc}")
        return False

    print(f"{colors.green}PASS:{colors.reset} {name}")
    return True


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    colors = Colors()
    session = requests.Session()
    product: dict[str, Any] = {}
    created_id: str | None = None

    def list_products() -> None:
        response = session.get(api_url(args.backend_url, "/api/products"), timeout=args.timeout)
        assert_condition(response.status_code == 200, f"expected 200, got {response.status_code}: {response.text}")
        assert_condition(isinstance(response.json(), list), "expected response JSON to be a list")

    def create_product() -> None:
        nonlocal created_id, product
        payload = {
            "name": f"Smoke Test Product {uuid.uuid4()}",
            "description": "Created by smoke_test.py",
            "price": 12.34,
        }
        response = session.post(api_url(args.backend_url, "/api/products"), json=payload, timeout=args.timeout)
        assert_condition(response.status_code == 201, f"expected 201, got {response.status_code}: {response.text}")
        product = response.json()
        created_id = product.get("id")
        assert_condition(bool(created_id), "created product did not include id")
        assert_condition(product.get("name") == payload["name"], "created product name mismatch")
        assert_condition(float(product.get("price")) == payload["price"], "created product price mismatch")

    def get_product() -> None:
        assert_condition(created_id is not None, "created_id is missing")
        response = session.get(api_url(args.backend_url, f"/api/products/{created_id}"), timeout=args.timeout)
        assert_condition(response.status_code == 200, f"expected 200, got {response.status_code}: {response.text}")
        found = response.json()
        assert_condition(found.get("id") == created_id, "fetched product id mismatch")
        assert_condition(found.get("name") == product.get("name"), "fetched product name mismatch")

    def update_product() -> None:
        nonlocal product
        assert_condition(created_id is not None, "created_id is missing")
        payload = {"name": f"Updated Smoke Product {int(time.time())}", "price": 23.45}
        response = session.put(api_url(args.backend_url, f"/api/products/{created_id}"), json=payload, timeout=args.timeout)
        assert_condition(response.status_code == 200, f"expected 200, got {response.status_code}: {response.text}")
        product = response.json()
        assert_condition(product.get("name") == payload["name"], "updated product name mismatch")
        assert_condition(float(product.get("price")) == payload["price"], "updated product price mismatch")

    def delete_product() -> None:
        assert_condition(created_id is not None, "created_id is missing")
        response = session.delete(api_url(args.backend_url, f"/api/products/{created_id}"), timeout=args.timeout)
        assert_condition(response.status_code == 204, f"expected 204, got {response.status_code}: {response.text}")

    def verify_deleted() -> None:
        assert_condition(created_id is not None, "created_id is missing")
        response = session.get(api_url(args.backend_url, f"/api/products/{created_id}"), timeout=args.timeout)
        assert_condition(response.status_code == 404, f"expected 404, got {response.status_code}: {response.text}")

    steps = [
        ("GET /api/products returns a list", list_products),
        ("POST /api/products creates a product", create_product),
        ("GET /api/products/:id returns the created product", get_product),
        ("PUT /api/products/:id updates the product", update_product),
        ("DELETE /api/products/:id deletes the product", delete_product),
        ("GET /api/products/:id returns 404 after delete", verify_deleted),
    ]

    results = [run_step(colors, name, fn) for name, fn in steps]
    if all(results):
        print(f"{colors.green}OK:{colors.reset} all smoke test steps passed")
        return 0

    if created_id is not None:
        try:
            session.delete(api_url(args.backend_url, f"/api/products/{created_id}"), timeout=args.timeout)
        except requests.RequestException:
            pass

    print(f"{colors.red}CRITICAL:{colors.reset} smoke test failed")
    return 1


if __name__ == "__main__":
    sys.exit(main())
