![TypeSetGo Banner](/public/assets/Banner-Color.png)

**TypeSetGo** is a modern, open-source typing platform designed for enthusiasts who want to improve their speed and accuracy. Inspired by the best tools in the community, it offers a clean, distraction-free environment with powerful features for both solo practice and competitive multiplayer racing.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## 📸 Showcase

### Distraction-Free Typing
![Interface Preview](/public/assets/showcase-typing.png)
*Focus entirely on your speed with a minimal, responsive interface.*

### Analytics
![Results Analysis](/public/assets/showcase-result.png)
*Analyze your performance with cards for WPM, accuracy, and consistency metrics.*

### Real-Time Multiplayer
![Connect Lobby](/public/assets/showcase-connect.png)
*Seamlessly join or host rooms in the Connect lobby.*

![Host Control](/public/assets/showcase-connect-hostpanel.png)
*Full control for hosts: manage participants with drag-and-drop sorting and customize typing settings.*

---

## ✨ Features

### 🚀 Core Typing Experience
Master your keyboard with a highly responsive engine.
- **Versatile Modes**: Practice with **Time**, **Word counts**, **Quotes** (Short to XL), **Zen** mode, or **Custom Text**.
- **Ghost Writer**: Race against a ghost cursor set to your target WPM to push your limits.
- **Deep Statistics**: Track your progress with real-time charts for WPM, Accuracy, Raw vs. Net speed, and consistency.
- **Smart Content**: Adaptive word lists ranging from "Beginner" to "Extreme" difficulty.

### 🌐 Connect (Multiplayer)
Challenge friends or colleagues in real-time.
- **Live Racing**: Create a room and race simultaneously.
- **Host Control**: Hosts have full control over test settings.
- **Drag-and-Drop Management**: Easily organize race participants directly from the host panel.
- **Real-time Dashboard**: Watch everyone's progress bar, WPM, and accuracy update live as they type.
- **Fair Play**: Synchronized start timers ensure every race is strictly fair.

### 🎨 Customization & Tech
- **Themes**: Visual themes for perfect contrast.
- **Sound Effects**: Optional mechanical keyboard sounds.
- **Modern Stack**: Built with **Bun**, **Vite**, **React 19**, **Tailwind CSS v4**, and **Convex** for real-time backend.
- **Type Safety**: Full TypeScript with Zod validation and react-hook-form.

---

## 🛠 Getting Started

### 🐳 Quick Start (Docker)
The fastest way to run TypeSetGo is with Docker:

```bash
cd docker
VITE_CONVEX_URL=https://your-project.convex.cloud docker-compose up -d
```

Or build and run manually:

```bash
docker build -f docker/Dockerfile --build-arg VITE_CONVEX_URL=https://your-project.convex.cloud -t typesetgo .
docker run -d -p 3000:80 typesetgo
```
Visit `http://localhost:3000` to start typing!

### 💻 Development Setup

If you want to contribute or run it locally without Docker:

**Prerequisites**: 
- [Bun](https://bun.sh) v1.0+
- [Convex](https://convex.dev) account (free tier available)

1.  **Clone the repo**
    ```bash
    git clone https://github.com/dmeim/typesetgo.git
    cd typesetgo
    ```

2.  **Install dependencies**
    ```bash
    bun install
    ```

3.  **Initialize Convex**
    ```bash
    bunx convex dev
    ```
    Follow the prompts to log in and create a project. This will create `.env.local` with your `VITE_CONVEX_URL`.

4.  **Run the dev server** (in a separate terminal)
    ```bash
    bun run dev
    ```

5.  **Open your browser**
    Navigate to [http://localhost:3000](http://localhost:3000).

### 📋 Available Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server (port 3000) |
| `bun run build` | Production build |
| `bun run test` | Run tests in watch mode |
| `bun run test:run` | Run tests once |
| `bun run lint` | Run ESLint |
| `bunx convex dev` | Start Convex dev server |

---

## 📖 Documentation

Detailed documentation is available in the `docs/` folder:

- [**Release Notes (v1.0.0)**](./docs/release-notes/v1.0.0.md)
- [**Core Typing Engine**](./docs/features/Core_Typing_Engine.md)
- [**Connect Multiplayer**](./docs/features/Connect_Multiplayer.md)
- [**Docker Guide**](./docs/deployment/DOCKER_GUIDE.md)

---

## 🤝 Contributing

We welcome contributions! Whether it's fixing a bug, adding a new theme, or improving the documentation, feel free to open a Pull Request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request
