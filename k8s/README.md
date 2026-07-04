# Products Studio on local Kubernetes with kind

This setup runs the full-stack app on a real Kubernetes cluster on your machine.
It uses kind, which means "Kubernetes in Docker": Kubernetes nodes are Docker
containers, so there is no cloud provider, no AWS account, and no billing.

## Prerequisites

- Docker Desktop with the WSL2 backend
- kubectl
- kind
- helm

This repo keeps local kind/helm binaries in `k8s/bin` when Chocolatey cannot
install globally without admin rights.

For low-memory WSL2 setups, this file helps Docker Desktop:

```ini
[wsl2]
memory=6GB
processors=4
```

Location:

```powershell
C:\Users\<you>\.wslconfig
```

After changing it, run:

```powershell
wsl --shutdown
```

Then restart Docker Desktop.

## Create the cluster

Start the local registry:

```powershell
docker run -d --restart=always -p 5001:5000 --name kind-registry registry:2
```

Create the single-node cluster:

```powershell
kind create cluster --name products --config k8s/kind-config.yaml
```

Connect the registry to kind:

```powershell
docker network connect kind kind-registry
kubectl apply -f k8s/local-registry-hosting.yaml
```

The node also needs this local registry host mapping:

```powershell
docker exec products-control-plane mkdir -p /etc/containerd/certs.d/localhost:5001
docker cp k8s/registry-hosts.toml products-control-plane:/etc/containerd/certs.d/localhost:5001/hosts.toml
```

## Build and push images after code changes

Backend:

```powershell
docker build -t products-backend:local ./backend
docker tag products-backend:local localhost:5001/products-backend:local
docker push localhost:5001/products-backend:local
```

Frontend:

```powershell
docker build --build-arg VITE_API_URL=http://localhost:8081 -t products-frontend:local ./frontend
docker tag products-frontend:local localhost:5001/products-frontend:local
docker push localhost:5001/products-frontend:local
```

Restart workloads after pushing:

```powershell
kubectl rollout restart deployment/backend -n products
kubectl rollout restart deployment/frontend -n products
kubectl rollout status deployment/backend -n products
kubectl rollout status deployment/frontend -n products
```

## Deploy with Helm

```powershell
helm lint k8s/charts/products -f k8s/charts/products/values-dev.yaml
helm template products k8s/charts/products -f k8s/charts/products/values-dev.yaml
kubectl delete -f k8s/manifests/
helm install products k8s/charts/products -n products --create-namespace -f k8s/charts/products/values-dev.yaml
kubectl wait --for=condition=Ready pod --all -n products --timeout=240s
```

Open:

- Frontend: http://localhost:8080
- Backend health: http://localhost:8081/health

Verify:

```powershell
curl.exe http://localhost:8081/health
curl.exe -I http://localhost:8080
```

The chart defaults are in `k8s/charts/products/values.yaml`. Local kind
overrides live in `k8s/charts/products/values-dev.yaml`. The base chart does
not contain a default Postgres password; provide one with a private values file,
`--set postgres.auth.password=...`, or `--set postgres.auth.existingSecret=...`.
The password in `values-dev.yaml` is a local-only throwaway value.

Examples:

```powershell
helm upgrade --install products k8s/charts/products -n products --create-namespace -f k8s/charts/products/values-dev.yaml
helm upgrade products k8s/charts/products -n products -f k8s/charts/products/values-dev.yaml --set backend.replicaCount=2
helm upgrade products k8s/charts/products -n products -f k8s/charts/products/values-dev.yaml --set backend.image.tag=local --set frontend.image.tag=local
helm upgrade products k8s/charts/products -n products --set postgres.auth.existingSecret=my-real-secret
```

`values-dev.yaml` is intentionally small so environment-specific settings are
easy to see. For example, changing `backend.replicaCount` there and running
`helm upgrade` scales only the backend deployment.

## Helm release operations

Upgrade after editing values:

```powershell
helm upgrade products k8s/charts/products -n products -f k8s/charts/products/values-dev.yaml
kubectl get pods -n products
```

View release history and roll back:

```powershell
helm history products -n products
helm rollback products 1 -n products
```

Uninstall the release:

```powershell
helm uninstall products -n products
```

## Check status and logs

```powershell
kubectl get pods -n products
kubectl get svc -n products
kubectl describe pod <pod-name> -n products
kubectl logs deployment/backend -n products
kubectl logs deployment/frontend -n products
kubectl logs deployment/postgres -n products
kubectl logs deployment/redis -n products
```

Watch pods:

```powershell
kubectl get pods -n products -w
```

If a pod fails, inspect it before changing the chart:

```powershell
kubectl describe pod <pod-name> -n products
kubectl logs <pod-name> -n products
```

## Security Controls

The Helm chart includes NetworkPolicies, non-root pod/container security
contexts, dropped Linux capabilities, read-only root filesystems where the
images support them, and Pod Security Standard labels on chart-managed
namespaces. See `docs/SECURITY.md` for the full posture and documented local
development exceptions.

For an existing local namespace created with `--create-namespace`, apply the Pod
Security Standard labels once:

```powershell
kubectl label namespace products pod-security.kubernetes.io/enforce=restricted pod-security.kubernetes.io/enforce-version=latest pod-security.kubernetes.io/audit=restricted pod-security.kubernetes.io/warn=restricted --overwrite
```

kind's default CNI (`kindnet`) does not enforce NetworkPolicies. The policies are
correctly defined and will be enforced in Calico/Cilium-based clusters. Installing
Calico into kind is optional for local enforcement, but it is not installed here
because it is heavier on RAM:

```powershell
# kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.30.2/manifests/calico.yaml
```

## Delete the cluster

```powershell
kind delete cluster --name products
```

Optional registry cleanup:

```powershell
docker stop kind-registry
docker rm kind-registry
```
