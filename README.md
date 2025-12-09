# Homelab Images

Custom container images for homelab infrastructure.

## Images

| Image | Description |
|-------|-------------|
| `caddy-cloudflare` | Caddy ingress controller with Cloudflare DNS module for DNS-01 ACME challenges |

## Usage

Images are automatically built and pushed to GHCR on push to main.

```bash
docker pull ghcr.io/saavy1/caddy-cloudflare:latest
```

## Adding a new image

1. Create a new directory with a `Dockerfile`
2. Copy `.github/workflows/template.yml` and update the paths/names
3. Push to trigger the build

## Manual build

```bash
cd <image-dir>
docker build -t ghcr.io/saavy1/<image-name>:latest .
docker push ghcr.io/saavy1/<image-name>:latest
```
