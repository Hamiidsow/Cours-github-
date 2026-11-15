import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import App from "./App";
import { I18nProvider } from "./lib/i18n";
import { SessionProvider } from "./lib/session";
import "./index.css";

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <SessionProvider>
          <App />
          <Toaster position="top-center" richColors closeButton />
        </SessionProvider>
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>,
);

// PWA : l'interface est mise en cache, jamais les données.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => undefined));
}
