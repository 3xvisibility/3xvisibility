import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { initEmojiIconOverrides } from "@/lib/emoji-icon-overrides";

// Hydrate custom emoji→icon mappings before any Elementor conversion runs.
initEmojiIconOverrides();

const rootEl = document.getElementById("root")!;
rootEl.classList.add("react-mounted");

createRoot(rootEl).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
