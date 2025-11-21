# Docker Deployment Guide

This guide will help you containerize and deploy the **TypeSetGo** application using Docker.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running on your machine.
- A terminal (Command Prompt, PowerShell, or Terminal).
- A GitHub account for automated builds.

## 1. Building the Docker Image Locally

Run the following command in the root directory of your project:

```bash
docker build -t typesetgo-app .
```

## 2. Automated Builds & Tagging Strategy

We use GitHub Actions to automatically build and tag Docker images.

### The Strategy
| GitHub Event | Docker Tags Created | Purpose |
| :--- | :--- | :--- |
| **Push to `main`** | `main`, `latest` | Always contains the most recent code (Bleeding Edge). |
| **Create Release** | `v1.0.0`, `v1.0`, `stable` | Known good versions. Use `stable` for production servers that need reliability. |

### How to Create a "Stable" Release

1.  Go to your repository on GitHub.
2.  Click **"Releases"** on the right sidebar.
3.  Click **"Draft a new release"**.
4.  **Choose a tag**: Create a new tag starting with `v` (e.g., `v1.0.0`).
5.  **Title**: Give it a name (e.g., "Initial Launch").
6.  Click **"Publish release"**.

*GitHub will automatically build the image and apply the `v1.0.0`, `v1.0`, and `stable` tags.*

## 3. Deployment (Pulling Images)

When deploying to a server, you can choose which version to use based on your needs.

### Option A: The Bleeding Edge (Default)
Use this if you always want the absolute newest code, even if it hasn't been "released" yet.
```bash
# These are equivalent:
docker pull ghcr.io/dmeim/typesetgo
docker pull ghcr.io/dmeim/typesetgo:latest
```

### Option B: The Stable Release
Use this for production servers where you only want code you have explicitly released.
```bash
docker pull ghcr.io/dmeim/typesetgo:stable
```

### Option C: A Specific Version
Use this if you need to rollback or stick to a specific version.
```bash
docker pull ghcr.io/dmeim/typesetgo:v1.0.0
```

## 4. Running the Container

Once pulled, run the container:

```bash
docker run -d -p 3000:3000 --name typesetgo ghcr.io/dmeim/typesetgo:latest
```

*Replace `:latest` with `:stable` or `:v1.0.0` as needed.*

## Troubleshooting

### "Port already in use"
```bash
# Maps localhost:4000 -> container:3000
docker run -p 4000:3000 ghcr.io/dmeim/typesetgo:latest
```

### Login to Registry
If the repository is private, you must log in first on the server:
```bash
echo $CR_PAT | docker login ghcr.io -u USERNAME --password-stdin
```
