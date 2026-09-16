import type { ReactNode } from "react";
import { AppNav } from "@/components/shell/app-nav";
import { LogoutButton } from "@/components/auth/logout-button";

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
        <header className="flex items-start justify-between gap-4 pt-8 pb-6">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-3xl leading-none">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            {actions}
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
