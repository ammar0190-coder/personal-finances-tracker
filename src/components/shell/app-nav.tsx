"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * PRD §8's "navigation shortcuts into every other module", as a real shell.
 *
 * Four destinations, and deliberately no Expense Log: §8 gives the Dashboard a
 * quick-add precisely so logging is an action rather than a place you navigate
 * to. Investments, IOU and Reports are each "a fully separate module" (§6, §7,
 * §9), so they get equal billing.
 *
 * Settings is reached from the header instead — it is opened rarely and does
 * not deserve the same weight as the four modules.
 */

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0" {...stroke}>
      {children}
    </svg>
  );
}

export interface Destination {
  href: string;
  label: string;
  icon: ReactNode;
}

export const DESTINATIONS: readonly Destination[] = [
  { href: "/", label: "Dashboard", icon: <Icon><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /></Icon> },
  {
    href: "/investments",
    label: "Investments",
    icon: (
      <Icon>
        <line x1="6" y1="20" x2="6" y2="13" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="18" y1="20" x2="18" y2="9" />
      </Icon>
    ),
  },
  {
    href: "/iou",
    label: "IOU",
    icon: (
      <Icon>
        <polyline points="17 2 21 6 17 10" />
        <path d="M21 6H8a4 4 0 0 0-4 4" />
        <polyline points="7 22 3 18 7 14" />
        <path d="M3 18h13a4 4 0 0 0 4-4" />
      </Icon>
    ),
  },
  {
    href: "/reports",
    label: "Reports",
    icon: (
      <Icon>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </Icon>
    ),
  },
];

/**
 * "/" is a prefix of every path, so the dashboard matches exactly while the
 * other modules match their subtree.
 */
export function isCurrent(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className={cn(
        // Phone: a thumb-reachable bar pinned to the bottom, above the safe area.
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]",
        // Desktop: the same links become a column in the shell's sidebar.
        "md:static md:z-auto md:border-t-0 md:bg-transparent md:pb-0",
      )}
    >
      <ul className="grid grid-cols-4 md:flex md:flex-col md:gap-1">
        {DESTINATIONS.map(({ href, label, icon }) => {
          const current = isCurrent(pathname, href);
          return (
            <li key={href} className="md:contents">
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 flex-col items-center justify-center gap-1 py-2 text-[0.6875rem] transition-colors",
                  "md:min-h-0 md:flex-row md:justify-start md:gap-3 md:rounded-lg md:px-3 md:py-2.5 md:text-sm",
                  current ? "text-primary md:bg-secondary md:text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {/* A second, non-colour signal for the active tab: colour alone
                    is unreadable for a colour-blind viewer. */}
                {current && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 h-0.5 w-6 rounded-full bg-primary md:top-auto md:left-0 md:h-5 md:w-0.5"
                  />
                )}
                {icon}
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
