import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

// PWA : enregistrement du service worker (installation via « Télécharger l'app »)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* environnement sans service worker — l'app fonctionne quand même */
    });
  });
}
