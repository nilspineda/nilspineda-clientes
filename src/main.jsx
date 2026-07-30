import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Safety hatch: set VITE_DISABLE_SW=true to disable all service workers
if (
  import.meta.env.VITE_DISABLE_SW === "true" &&
  typeof window !== "undefined" &&
  "serviceWorker" in navigator
) {
  navigator.serviceWorker.getRegistrations().then((regs) =>
    regs.forEach((r) => {
      try {
        r.unregister();
      } catch (e) {}
    }),
  );
  if ("caches" in window) {
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
