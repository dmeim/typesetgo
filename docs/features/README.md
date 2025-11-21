# TypeSetGo Documentation

Welcome to the TypeSetGo technical documentation. This folder contains detailed guides on the project's core features, architecture, and content management systems.

## Feature Guides

### [Core Typing Engine](./features/Core_Typing_Engine.md)
The heart of the application. This document explains how the typing test works, including:
-   **Modes**: Time, Words, Quote, Zen, Preset.
-   **Statistics**: How WPM and Accuracy are calculated.
-   **Configuration**: Settings for difficulty, duration, and visual themes.
-   **Architecture**: How the `TypingPractice` component handles input and state.

### [Connect (Multiplayer)](./features/Connect_Multiplayer.md)
Documentation for the real-time multiplayer feature.
-   **Architecture**: Client-Server model using Socket.IO.
-   **Host & Join**: How rooms are created, managed, and synchronized.
-   **Events**: The protocol used for real-time communication.
-   **Reconnection**: Handling disconnects and session persistence.

### [Content Management](./features/Content_Management.md)
How to manage the text content used in typing tests.
-   **Word Lists**: JSON structure for random word generation.
-   **Quotes**: Database of quotes filtered by length.
-   **Adding Content**: Instructions for contributors to add new words or quotes.

## Product Requirements (PRDs)
For the vision and requirements of upcoming features, check the [PRDs](../PRDs/) directory.
