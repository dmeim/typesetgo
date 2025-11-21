# TypeSetGo

TypeSetGo is a minimalistic, feature-rich typing test application inspired by Monkeytype. It offers a distraction-free environment to improve your typing speed and accuracy, with robust features for customization, statistics, and multiplayer competition.

## Features

### ⌨️ Typing Modes
- **Time**: Type as many words as possible in a fixed time (15s, 30s, 60s, etc.).
- **Words**: Type a set number of random words.
- **Quotes**: Practice with real quotes from books, movies, and history. Filter by length (Short, Medium, Long, XL).
- **Zen**: Infinite typing practice with no timers or counters.
- **Preset**: Create or load custom text for specialized practice.

### 🎨 Customization & UX
- **Themes**: Switch between various visual themes to suit your preference.
- **Ghost Writer**: Practice against a ghost cursor moving at a set speed to pace yourself.
- **Sound Effects**: Satisfying mechanical keyboard sounds (optional).
- **Clean UI**: A focused interface designed to minimize distractions.

### 🌐 Connect (Multiplayer)
Race against friends or colleagues in real-time!
- **Create Rooms**: Hosts can create private rooms with custom settings.
- **Live Dashboard**: See real-time WPM and progress of all participants.
- **Synced Start**: The host controls when the race begins, ensuring a fair start.

### 📊 Statistics
- **Real-time Metrics**: WPM (Words Per Minute) and Accuracy updated as you type.
- **Raw vs Net**: See your gross speed versus your error-adjusted speed.
- **Consistency**: Track how stable your typing rhythm is.

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/dmeim/typesetgo.git
    cd typesetgo
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run the development server:
    ```bash
    npm run dev
    ```

4.  Open [http://localhost:3000](http://localhost:3000) with your browser.

## Deployment

TypeSetGo is optimized for Docker deployment.

### Docker

Build and run the container locally:

```bash
docker build -t typesetgo-app .
docker run -d -p 3000:3000 --name typesetgo typesetgo-app
```

For detailed deployment instructions, including using GitHub Container Registry, see the [Docker Deployment Guide](./docs/deployment/DOCKER_GUIDE.md).

## Documentation

Comprehensive documentation is available in the `docs/` directory:

-   [**Core Typing Engine**](./docs/features/Core_Typing_Engine.md): How the typing logic works.
-   [**Connect (Multiplayer)**](./docs/features/Connect_Multiplayer.md): Architecture of the real-time features.
-   [**Content Management**](./docs/features/Content_Management.md): How to add new words and quotes.

## Contributing

Contributions are welcome! Please check out the issues tab or submit a Pull Request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request
