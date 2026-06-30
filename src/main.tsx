import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ConfigErrorScreen from "./components/ConfigErrorScreen.tsx";
import { appConfig } from "./lib/appConfig.ts";
import "./index.css";
import "./i18n";

const root = document.getElementById("root")!;

if (!appConfig.ok) {
  createRoot(root).render(<ConfigErrorScreen message={appConfig.message} />);
} else {
  createRoot(root).render(<App />);
}
