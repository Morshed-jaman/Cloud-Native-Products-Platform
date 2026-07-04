# CI/CD

This project uses GitHub Actions and GitHub Container Registry only, so it stays
within the free GitHub-hosted workflow and GHCR setup for a normal repository.

## Workflows

### CI

`.github/workflows/ci.yml` runs on every push and pull request targeting `main`.

It has four jobs:

- `backend-ci`: installs backend dependencies with Node.js 20, runs lint when a
  lint script exists, runs `npm test`, and runs `npm run build`.
- `frontend-ci`: installs frontend dependencies with Node.js 20 and runs
  `npm run build`.
- `helm-validate`: installs Helm, runs
  `helm lint k8s/charts/products -f k8s/charts/products/values-dev.yaml`, and
  renders the chart with
  `helm template products k8s/charts/products -f k8s/charts/products/values-dev.yaml`.
- `build-and-scan`: builds the backend and frontend Docker images for
  `linux/amd64` into the runner Docker daemon without pushing them, then scans
  those local images with Trivy. The job fails only when CRITICAL
  vulnerabilities are found. Unfixed vulnerabilities are ignored.

### Release

`.github/workflows/release.yml` runs only when a tag matching `v*.*.*` is pushed.

It builds both production Docker images for `linux/amd64`, tags each image with
the git tag and `latest`, then pushes them to GitHub Container Registry using
the built-in `GITHUB_TOKEN`.

The workflow permissions are:

```yaml
permissions:
  contents: read
  packages: write
```

No extra GitHub secrets are required.

## Published Images

Images are published under the lowercased GitHub repository path:

```text
ghcr.io/<user>/<repo>/products-backend:<tag>
ghcr.io/<user>/<repo>/products-backend:latest
ghcr.io/<user>/<repo>/products-frontend:<tag>
ghcr.io/<user>/<repo>/products-frontend:latest
```

For example, a `v1.0.0` release publishes:

```text
ghcr.io/<user>/<repo>/products-backend:v1.0.0
ghcr.io/<user>/<repo>/products-frontend:v1.0.0
```

## Cut a Release

Create and push a semantic version tag:

```powershell
git tag v1.0.0
git push origin v1.0.0
```

Then open the repository on GitHub and watch the **Actions** tab. When the
release workflow finishes, open **Packages** in the repository or your GitHub
profile to see the published GHCR images.

## Add a CI Badge

Add this near the top of the main `README.md`, replacing `<user>` and `<repo>`:

```markdown
[![CI](https://github.com/<user>/<repo>/actions/workflows/ci.yml/badge.svg)](https://github.com/<user>/<repo>/actions/workflows/ci.yml)
```

## First Push to GitHub

After creating an empty GitHub repository, connect and push this local repo:

```powershell
git remote add origin https://github.com/<user>/<repo>.git
git branch -M main
git push -u origin main
```
