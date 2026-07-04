# Security Posture

## Threat Model

The frontend is the public entry point and is reachable through the local kind
NodePort. The backend is an internal API that should only receive traffic from
the frontend and, for local development, direct NodePort health checks. Postgres
and Redis are private data services and should only receive traffic from the
backend.

The local kind cluster is for development and demonstrations, not internet-facing
production traffic. The chart is hardened so the same workload definitions move
cleanly to a real cluster with an enforcing CNI.

## Controls Implemented

- NetworkPolicies define default-deny ingress and egress, then explicitly allow
  DNS, frontend-to-backend, backend-to-Postgres, and backend-to-Redis traffic.
- Namespace Pod Security Standard labels request `restricted` for enforce,
  audit, and warn when the chart manages the namespace.
- All workload pods set `runAsNonRoot: true` and `seccompProfile:
  RuntimeDefault`.
- All containers disable privilege escalation and drop all Linux capabilities.
- Backend and frontend use read-only root filesystems with writable `emptyDir`
  mounts for `/tmp`.
- The frontend nginx container also gets writable `emptyDir` mounts for
  `/var/cache/nginx` and `/var/run`.
- Postgres and Redis run as their image users (`70:70` and `999:1000`) with
  dropped capabilities and no privilege escalation.
- Postgres uses a no-overlap rolling strategy (`maxSurge: 0`,
  `maxUnavailable: 1`) so a replacement pod does not run concurrently against
  the same single-writer PVC.
- Postgres credentials no longer have a production default password in
  `values.yaml`; a password or existing Secret is required at render/install
  time.
- CI scans built images with Trivy and fails on CRITICAL findings.

## Secrets Management

For local development, `k8s/charts/products/values-dev.yaml` contains a
throwaway password for the local kind cluster.

For production, prefer an externally managed Secret:

```powershell
helm upgrade --install products k8s/charts/products -n products --create-namespace --set postgres.auth.existingSecret=my-real-secret
```

The existing Secret must provide these keys:

```text
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_DB
DATABASE_URL
```

`DATABASE_URL` should point at the in-cluster Postgres service, for example:

```text
postgresql://app:<password>@postgres:5432/products_db
```

In a real production cluster, use an external secrets operator or cloud-native
secret manager integration instead of committing sensitive values to Git.

## Documented Exceptions

Postgres and Redis keep `readOnlyRootFilesystem: false` by chart value. Their
official images need writable runtime/data paths during startup, and the local
deployment keeps those services lightweight. Postgres persists data on the chart
PVC at `/var/lib/postgresql/data`; Redis uses an `emptyDir` at `/data`.

The backend NetworkPolicy includes a local-development-only ingress rule that
allows direct NodePort health checks on port 4000. In production, restrict that
rule to ingress-controller pods or remove direct NodePort exposure.

The frontend uses the existing nginx image as non-root UID/GID `101:101`.
Writable runtime/cache directories are mounted explicitly so nginx can start
without a writable image filesystem.

## Known Gaps

kind's default CNI (`kindnet`) does not enforce NetworkPolicies. The policies
are valid Kubernetes objects and will be enforced on a Calico, Cilium, or other
NetworkPolicy-capable CNI. Local enforcement in kind is optional, but Calico is
intentionally not installed here because it adds memory overhead to a small WSL2
cluster.

The dev values file sets `namespace.create: false` because this local namespace
was originally created by `helm install --create-namespace`. The chart template
contains the Pod Security Standard labels for chart-managed namespaces; the
current local namespace was labeled directly during verification.

The local registry and local NodePorts are development conveniences. They should
be replaced by a private registry, controlled ingress, TLS, and production-grade
identity boundaries in a real environment.

The kube-bench node report is saved at `docs/security/kube-bench-report.txt`.
For this local kind node it reported:

```text
17 checks PASS
2 checks FAIL
6 checks WARN
0 checks INFO
```

The failures are node file-permission findings on the kind node:

- `4.1.1` kubelet service file permissions should be `600` or more restrictive.
- `4.1.9` kubelet `config.yaml` permissions should be `600` or more restrictive.

## Production Improvements

- Use an external secrets operator or cloud secret manager.
- Use a NetworkPolicy-enforcing CNI such as Cilium or Calico.
- Restrict backend ingress to ingress-controller or gateway pods only.
- Add mTLS between services through a service mesh or sidecarless CNI feature.
- Sign images and enforce signature verification with admission policy.
- Add admission policy checks for required security contexts and trusted image
  registries.
- Send audit logs and runtime security events to a monitoring/SIEM platform.
