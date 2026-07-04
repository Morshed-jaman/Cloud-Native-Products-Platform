#!/usr/bin/env python3
#
# Purpose: Snapshot Kubernetes node, pod, PVC, service, and resource settings into Markdown.
# Usage: py -3 scripts/python/k8s_resource_report.py [--namespace products] [--output ./reports/cluster-report.md]
# Example: py -3 scripts/python/k8s_resource_report.py --namespace products

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from collections import Counter
from pathlib import Path
from typing import Any


class Colors:
    def __init__(self) -> None:
        enabled = sys.stdout.isatty()
        self.green = "\033[32m" if enabled else ""
        self.red = "\033[31m" if enabled else ""
        self.blue = "\033[34m" if enabled else ""
        self.reset = "\033[0m" if enabled else ""


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Generate a Markdown Kubernetes resource report.")
    parser.add_argument("--namespace", default="products", help="Namespace to inspect for per-pod details.")
    parser.add_argument("--output", default="./reports/cluster-report.md", help="Markdown report path.")
    return parser


def kubectl_json(args: list[str]) -> dict[str, Any]:
    command = ["kubectl", *args, "-o", "json"]
    result = subprocess.run(command, check=False, text=True, capture_output=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or "kubectl command failed")
    return json.loads(result.stdout)


def cpu_to_millicores(value: str) -> int:
    if not value:
        return 0
    if value.endswith("m"):
        return int(float(value[:-1]))
    return int(float(value) * 1000)


def mem_to_mib(value: str) -> int:
    if not value:
        return 0
    units = {
        "Ki": 1 / 1024,
        "Mi": 1,
        "Gi": 1024,
        "Ti": 1024 * 1024,
        "K": 1000 / (1024 * 1024),
        "M": 1000 * 1000 / (1024 * 1024),
        "G": 1000 * 1000 * 1000 / (1024 * 1024),
    }
    for suffix, multiplier in units.items():
        if value.endswith(suffix):
            return int(float(value[: -len(suffix)]) * multiplier)
    return int(float(value) / (1024 * 1024))


def quantity(resources: dict[str, Any], key: str, name: str) -> str:
    return str(resources.get(key, {}).get(name, ""))


def render_report(namespace: str) -> str:
    nodes = kubectl_json(["get", "nodes"])
    all_pods = kubectl_json(["get", "pods", "--all-namespaces"])
    pods = kubectl_json(["get", "pods", "-n", namespace])
    pvcs = kubectl_json(["get", "pvc", "-n", namespace])
    services = kubectl_json(["get", "svc", "-n", namespace])

    pod_counts = Counter(item["metadata"]["namespace"] for item in all_pods.get("items", []))
    warnings: list[str] = []
    total_cpu_requests = 0
    total_cpu_limits = 0
    total_mem_requests = 0
    total_mem_limits = 0

    lines = [
        "# Kubernetes Resource Report",
        "",
        f"Namespace: `{namespace}`",
        "",
        "## Nodes",
        "",
        "| Name | CPU Capacity | Memory Capacity | Pods Capacity |",
        "| --- | ---: | ---: | ---: |",
    ]

    for node in nodes.get("items", []):
        capacity = node.get("status", {}).get("capacity", {})
        lines.append(
            "| {name} | {cpu} | {memory} | {pods} |".format(
                name=node["metadata"]["name"],
                cpu=capacity.get("cpu", ""),
                memory=capacity.get("memory", ""),
                pods=capacity.get("pods", ""),
            )
        )

    lines.extend(["", "## Pod Count Per Namespace", "", "| Namespace | Pods |", "| --- | ---: |"])
    for pod_namespace, count in sorted(pod_counts.items()):
        lines.append(f"| {pod_namespace} | {count} |")

    lines.extend(
        [
            "",
            "## Pod Resources",
            "",
            "| Pod | Container | CPU Request | CPU Limit | Memory Request | Memory Limit |",
            "| --- | --- | ---: | ---: | ---: | ---: |",
        ]
    )

    for pod in pods.get("items", []):
        pod_name = pod["metadata"]["name"]
        for container in pod.get("spec", {}).get("containers", []):
            container_name = container["name"]
            resources = container.get("resources", {})
            cpu_request = quantity(resources, "requests", "cpu")
            cpu_limit = quantity(resources, "limits", "cpu")
            mem_request = quantity(resources, "requests", "memory")
            mem_limit = quantity(resources, "limits", "memory")

            total_cpu_requests += cpu_to_millicores(cpu_request)
            total_cpu_limits += cpu_to_millicores(cpu_limit)
            total_mem_requests += mem_to_mib(mem_request)
            total_mem_limits += mem_to_mib(mem_limit)

            if not resources.get("requests") or not resources.get("limits"):
                warnings.append(f"Pod `{pod_name}` container `{container_name}` is missing resource requests or limits.")
            if not container.get("readinessProbe") or not container.get("livenessProbe"):
                warnings.append(f"Pod `{pod_name}` container `{container_name}` is missing readiness or liveness probes.")

            lines.append(
                f"| {pod_name} | {container_name} | {cpu_request or '-'} | {cpu_limit or '-'} | {mem_request or '-'} | {mem_limit or '-'} |"
            )

    lines.extend(
        [
            "",
            "## PVCs",
            "",
            "| Name | Status | Capacity | Access Modes | StorageClass |",
            "| --- | --- | ---: | --- | --- |",
        ]
    )
    for pvc in pvcs.get("items", []):
        spec = pvc.get("spec", {})
        status = pvc.get("status", {})
        lines.append(
            "| {name} | {phase} | {capacity} | {modes} | {storage_class} |".format(
                name=pvc["metadata"]["name"],
                phase=status.get("phase", ""),
                capacity=status.get("capacity", {}).get("storage", spec.get("resources", {}).get("requests", {}).get("storage", "")),
                modes=", ".join(spec.get("accessModes", [])),
                storage_class=spec.get("storageClassName", ""),
            )
        )

    lines.extend(
        [
            "",
            "## Services",
            "",
            "| Name | Type | ClusterIP | Ports |",
            "| --- | --- | --- | --- |",
        ]
    )
    for service in services.get("items", []):
        spec = service.get("spec", {})
        ports = []
        for port in spec.get("ports", []):
            node_port = f":{port.get('nodePort')}" if port.get("nodePort") else ""
            ports.append(f"{port.get('port')}{node_port}/{port.get('protocol', 'TCP')}")
        lines.append(
            "| {name} | {type} | {cluster_ip} | {ports} |".format(
                name=service["metadata"]["name"],
                type=spec.get("type", ""),
                cluster_ip=spec.get("clusterIP", ""),
                ports=", ".join(ports),
            )
        )

    lines.extend(
        [
            "",
            "## Totals",
            "",
            f"- CPU requests: {total_cpu_requests}m",
            f"- CPU limits: {total_cpu_limits}m",
            f"- Memory requests: {total_mem_requests}Mi",
            f"- Memory limits: {total_mem_limits}Mi",
            "",
            "## Warnings",
            "",
        ]
    )
    if warnings:
        lines.extend(f"- {warning}" for warning in warnings)
    else:
        lines.append("No warnings.")

    lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    colors = Colors()

    if shutil.which("kubectl") is None:
        print(f"{colors.red}ERROR:{colors.reset} kubectl is not on PATH")
        return 127

    try:
        markdown = render_report(args.namespace)
    except (RuntimeError, json.JSONDecodeError, ValueError) as exc:
        print(f"{colors.red}ERROR:{colors.reset} {exc}")
        return 1

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(markdown, encoding="utf-8")
    print(f"{colors.green}PASS:{colors.reset} wrote {output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
