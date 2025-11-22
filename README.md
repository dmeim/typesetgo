![TypeSetGo Banner](/public/assets/Banner-Color.png)

**TypeSetGo** is a modern, open-source typing platform designed for enthusiasts who want to improve their speed and accuracy. Inspired by the best tools in the community, it offers a clean, distraction-free environment with powerful features for both solo practice and competitive multiplayer racing.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## ✨ Features

### 🚀 Core Typing Experience
Master your keyboard with a highly responsive engine.
- **Versatile Modes**: Practice with **Time** (15s/30s/60s), **Word counts**, **Quotes** (Short to XL), or go infinite with **Zen** mode.
- **Ghost Writer**: Race against a ghost cursor set to your target WPM to push your limits.
- **Deep Statistics**: Track your progress with real-time charts for WPM, Accuracy, Raw vs. Net speed, and consistency.

### 🌐 Connect (Multiplayer)
Challenge friends or colleagues in real-time.
- **Live Racing**: Create a room and race simultaneously.
- **Host Control**: Hosts have full control over the test settings (difficulty, duration, etc.).
- **Real-time Dashboard**: Watch everyone's progress bar, WPM, and accuracy update live as they type.
- **Fair Play**: Synchronized start timers ensure every race is fair.

### 🎨 Customization
- **Themes**: Toggle between different visual themes to find your perfect contrast.
- **Sound Effects**: Optional mechanical keyboard sounds for auditory feedback.
- **Content**: A rich library of quotes and word lists ranging from "Beginner" to "Extreme".

---

## 📸 Screenshots

![Interface Preview](/public/assets/showcase-typing.png)
*The clean, focused typing interface.*

![Multiplayer Preview](/public/assets/showcase-connect-hostpanel.png)
*Real-time multiplayer dashboard.*

---

## 🛠 Getting Started

### 🐳 Quick Start (Docker)
The fastest way to run TypeSetGo is with Docker.

```bash
docker build -t typesetgo-app .
docker run -d -p 3000:3000 --name typesetgo typesetgo-app
```
Visit `http://localhost:3000` to start typing!

### 💻 Development Setup

If you want to contribute or run it locally without Docker:

**Prerequisites**: Node.js 18+

1.  **Clone the repo**
    ```bash
    git clone https://github.com/dmeim/typesetgo.git
    cd typesetgo
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run the dev server**
    ```bash
    npm run dev
    ```

4.  **Open your browser**
    Navigate to [http://localhost:3000](http://localhost:3000).

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
