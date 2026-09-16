import type { ReactNode } from "react";
import Link from "next/link";
import { AppNav } from "@/components/shell/app-nav";
import { LogoutButton } from "@/components/auth/logout-button";

/**
 * Account Settings sits in the header rather than the tab bar: it is opened
 * rarely and does not deserve the weight of the four modules (M8 design spec).
 * The bar's contents are guarded by app-nav.test.tsx.
 */
function SettingsLink() {
  return (
    <Link
      href="/settings"
      aria-label="Account settings"
      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </Link>
  );
}

/**
 * The shell every authenticated page renders inside (M8a).
 *
 * Phone-first: navigation is a bar pinned to the bottom, within thumb reach and
 * still there once you scroll. On desktop the same four links become a fixed
 * sidebar.
 *
 * The <aside> is `display: contents` on phones, so it generates no box and the
 * nav inside it can pin itself to the bottom of the viewport; on desktop it
 * becomes the sidebar proper. That keeps ONE navigation in the document —
 * rendering a second copy for the other breakpoint would give the page two
 * "Main" landmarks and two elements claiming aria-current.
 */
export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  /** Page-level actions shown beside the title, e.g. quick-add. */
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-full md:pl-56">
      <aside className="contents md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex md:w-56 md:flex-col md:gap-8 md:border-r md:border-border md:bg-card md:p-4">
        <div className="hidden px-3 pt-2 font-heading text-xl md:block">Finances</div>
        <AppNav />
        <div className="mt-auto hidden px-1 md:block">
          <LogoutButton />
        </div>
      </aside>

      <div className="mx-auto w-full max-w-3xl px-5 md:px-8">
        {/*
          `flex-wrap` and `min-w-0` together are what keep this off the edge at
          phone width. Without min-w-0 a flex item refuses to shrink below its
          content, so a long title or subtitle pushes the actions past the
          viewport and the whole page scrolls sideways — which it did, by 67px
          at 390px, until this was measured. tests/e2e/layout.spec.ts guards it.
        */}
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 pt-8 pb-6">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="font-heading text-3xl leading-none">{title}</h1>
            {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {actions}
            <SettingsLink />
            <span className="md:hidden">
              <LogoutButton />
            </span>
          </div>
        </header>

        {/* Bottom padding clears the fixed nav bar on phones. */}
        <main className="flex flex-col gap-8 pb-28 md:pb-12">{children}</main>
      </div>
    </div>
  );
}
