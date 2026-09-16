import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import Fixture from "./Fixture";
import { ThemeProvider } from "@/context/ThemeContext";
import "@/index.css";
import { NotificationProvider } from "@/lib/notification-store";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <NotificationProvider><ThemeProvider>
      <BrowserRouter>
        <Fixture />
      </BrowserRouter>
    </ThemeProvider></NotificationProvider>
  </React.StrictMode>,
);
