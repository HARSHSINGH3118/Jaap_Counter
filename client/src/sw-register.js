// Registers the service worker and handles updates.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((reg) => {
        // Listen for updates
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) {
              // New version available; you could show a toast/snackbar here.
              console.info("New version installed, refreshing cache soon.");
            }
          });
        });
      })
      .catch((e) => console.warn("SW register failed:", e));
  });
}
