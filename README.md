<p align="center">
  <picture>
    <source
      media="(prefers-color-scheme: dark)"
      srcset="public/assets/Banner-Color.png"
    />
    <img
      src="public/assets/Banner-Black.png"
      alt="TypeSetGo"
      width="640"
    />
  </picture>
</p>

<p align="center">
  <a href="https://github.com/dmeim/typesetgo"><img src="https://img.shields.io/badge/version-0.2.0-blue" alt="Version" /></a>
  <a href="https://github.com/dmeim/typesetgo"><img src="https://img.shields.io/badge/platform-Web-orange" alt="Platform" /></a>
  <a href="src/"><img src="https://img.shields.io/badge/stack-React%2019%20%C2%B7%20Vite%20%C2%B7%20TS%20%C2%B7%20Convex%20%C2%B7%20Tailwind%20v4-61dafb" alt="Stack" /></a>
</p>

A modern, open-source typing practice platform with a clean, distraction-free interface. Multiple test modes, 1300+ themes, sound packs, real-time statistics, and deep customization — all powered by a real-time **Convex** backend with optional **Clerk** authentication.

## Highlights

- **Multiple modes** — Time, Words, Quotes (Short–XL), Zen, Preset, and Custom Text
- **1300+ themes** — Light, dark, and seasonal themes with live preview
- **Ghost Writer** — Race a ghost cursor set to your target WPM
- **Deep statistics** — Real-time WPM, accuracy, raw vs. net speed, consistency charts
- **Sound packs** — Mechanical keyboard sounds (typewriter, creamy, robo, and more)
- **Adaptive difficulty** — Word lists from Beginner to Extreme
- **User accounts** — Track history, streaks, achievements, and leaderboard rankings
- **Self-hostable** — Docker image with nginx for easy deployment

## Screenshots

> *Screenshots coming soon — the app is actively evolving and new captures will be added here in a 2×2 grid.*

## Quick Start

### Docker

```bash
cd docker
VITE_CONVEX_URL=https://your-project.convex.cloud docker-compose up -d
```

Visit `http://localhost:3000` to start typing.

### Development

**Prerequisites:** [Bun](https://bun.sh) v1.0+ and a [Convex](https://convex.dev) account (free tier available).

```bash
git clone https://github.com/dmeim/typesetgo.git
cd typesetgo
bun install
```

Run two terminals:

```bash
bunx convex dev          # Terminal 1 — backend
bun run dev              # Terminal 2 — frontend (port 3000)
```

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server |
| `bun run build` | Production build |
| `bun run test:run` | Run tests |
| `bun run lint` | Run ESLint |
| `bunx convex dev` | Start Convex backend |

## Documentation

- **[Docker Deployment](docs/deployment/DOCKER_GUIDE.md)** — container setup and configuration
- **[Core Typing Engine](docs/features/Core_Typing_Engine.md)** — modes, statistics, and architecture
- **[Content Management](docs/features/Content_Management.md)** — word lists, quotes, and adding content
- **[Release Notes](docs/release-notes/)** — changelog and version history
- **[Product Roadmap](docs/TODO.md)** — planned features and progress

*More documentation is planned — theme customization, sound packs, settings reference, keyboard shortcuts, and contributor guides are on the list.*

---

<p align="center">
  <a href="docs/">Docs</a> ·
  <a href="docs/TODO.md">Roadmap</a>
</p>
