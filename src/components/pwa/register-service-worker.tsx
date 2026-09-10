"use client";

import { useEffect } from "react";
import { shouldRegisterServiceWorker } from "@/lib/pwa/register";

/**
 * Installs the service worker that makes the app addable to a home screen
 * (PRD §14). Renders nothing; the decision rule it defers to is tested in
 * `src/lib/pwa/__tests__/register.test.ts`.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!shouldRegisterServiceWorker(process.env.NODE_ENV, "serviceWorker" in navigator)) return;

    // A failed registration must never take the page down with it — the app
    // works fine without a worker, it just isn't installable.
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed", error);
    });
  }, []);

  return null;
}
