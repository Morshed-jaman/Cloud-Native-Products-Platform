#!/usr/bin/env python3
#
# Purpose: Run Trivy for one or more local images and generate a Markdown vulnerability report.
# Usage: py -3 scripts/python/image_vuln_report.py --image products-backend:local [--output ./reports/vuln-report.md]
# Example: py -3 scripts/python/image_vuln_report.py --image products-backend:local --image products-frontend:local --fail-on CRITICAL

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"]
SEVERITY_RANK = {severity: index for index, severity in enumerate(SEVERITIES)}


class Colors:
    def __init__(self) -> None:
        enabled = sys.stdout.isatty()
        self.green = "\033[32m" if enabled else ""
        self.red = "\033[31m" if enabled else ""
        self.blue = "\033[34m" if enabled else ""
        self.reset = "\033[0m" if enabled else ""


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Generate a Markdown vulnerability report from Trivy JSON output."
    )
    parser.add_argument("--image", action="append", required=True, help="Image to scan. Repeat for multiple images.")
    parser.add_argument("--output", default="./reports/vuln-report.md", help="Markdown report path.")
    parser.add_argument(
        "--fail-on",
        default="CRITICAL",
        choices=SEVERITIES,
        help="Exit non-zero if this severity or worse is present.",
    )
    return parser


def run_trivy(image: str) -> dict[str, Any]:
    command = ["trivy", "image", "--format", "json", image]
    result = subprocess.run(command, check=False, text=True, capture_output=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or f"trivy failed for {image}")
    return json.loads(result.stdout)


def vulnerabilities_from_report(image: str, report: dict[str, Any]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for result in report.get("Results", []):
        target = str(result.get("Target", ""))
        for vuln in result.get("Vulnerabilities") or []:
            severity = str(vuln.get("Severity", "UNKNOWN")).upper()
            rows.append(
                {
                    "image": image,
                    "target": target,
                    "severity": severity if severity in SEVERITY_RANK else "UNKNOWN",
                    "id": str(vuln.get("VulnerabilityID", "")),
                    "package": str(vuln.get("PkgName", "")),
                    "installed": str(vuln.get("InstalledVersion", "")),
                    "fixed": str(vuln.get("FixedVersion", "")),
                    "title": str(vuln.get("Title", "") or vuln.get("Description", "")).replace("\n", " "),
                }
            )
    return rows


def escape_cell(value: str) -> str:
    return value.replace("|", "\\|").strip()


def render_markdown(images: list[str], rows: list[dict[str, str]]) -> str:
    counts = Counter(row["severity"] for row in rows)
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        grouped[row["severity"]].append(row)

    lines = [
        "# Trivy Image Vulnerability Report",
        "",
        "## Images",
        "",
    ]
    lines.extend(f"- `{image}`" for image in images)
    lines.extend(["", "## Summary", "", "| Severity | Count |", "| --- | ---: |"])
    lines.extend(f"| {severity} | {counts.get(severity, 0)} |" for severity in SEVERITIES)

    for severity in SEVERITIES:
        severity_rows = grouped.get(severity, [])
        lines.extend(["", f"## {severity}", ""])
        if not severity_rows:
            lines.append("No findings.")
            continue

        lines.extend(
            [
                "| Image | Target | CVE | Package | Installed | Fixed | Title |",
                "| --- | --- | --- | --- | --- | --- | --- |",
            ]
        )
        for row in sorted(severity_rows, key=lambda item: (item["image"], item["package"], item["id"])):
            lines.append(
                "| {image} | {target} | {id} | {package} | {installed} | {fixed} | {title} |".format(
                    image=escape_cell(row["image"]),
                    target=escape_cell(row["target"]),
                    id=escape_cell(row["id"]),
                    package=escape_cell(row["package"]),
                    installed=escape_cell(row["installed"]),
                    fixed=escape_cell(row["fixed"]),
                    title=escape_cell(row["title"]),
                )
            )

    lines.append("")
    return "\n".join(lines)


def should_fail(rows: list[dict[str, str]], fail_on: str) -> bool:
    threshold = SEVERITY_RANK[fail_on]
    return any(SEVERITY_RANK.get(row["severity"], len(SEVERITIES)) <= threshold for row in rows)


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    colors = Colors()

    if shutil.which("trivy") is None:
        print(f"{colors.red}ERROR:{colors.reset} trivy is not on PATH")
        return 127

    all_rows: list[dict[str, str]] = []
    try:
        for image in args.image:
            print(f"{colors.blue}==>{colors.reset} scanning {image}")
            report = run_trivy(image)
            all_rows.extend(vulnerabilities_from_report(image, report))
    except (RuntimeError, json.JSONDecodeError) as exc:
        print(f"{colors.red}ERROR:{colors.reset} {exc}")
        return 1

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(render_markdown(args.image, all_rows), encoding="utf-8")
    print(f"{colors.green}PASS:{colors.reset} wrote {output}")

    if should_fail(all_rows, args.fail_on):
        print(f"{colors.red}FAIL:{colors.reset} findings at or above {args.fail_on} are present")
        return 2

    return 0


if __name__ == "__main__":
    sys.exit(main())
