/**
 * Whether this environment should install the service worker.
 *
 * Kept separate from the component that calls it so the rule is testable
 * without a DOM: in development the worker would cache build output that
 * changes constantly, producing stale pages that survive a reload.
 */
export function shouldRegisterServiceWorker(nodeEnv: string | undefined, hasServiceWorker: boolean): boolean {
  return nodeEnv === "production" && hasServiceWorker;
}
