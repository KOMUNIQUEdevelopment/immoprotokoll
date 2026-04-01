import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n";

// Capture beforeinstallprompt as early as possible — before any React
// component mounts. Chrome fires this event early in the page lifecycle
// and it will be missed if we only listen inside a useEffect.
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  (window as any).__deferredInstallPrompt = e;
});

createRoot(document.getElementById("root")!).render(<App />);
