"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPrivacyMode } from "@/lib/actions/settings";
import { cn } from "@/lib/utils";

/**
 * PRD §2: privacy mode masks account balances (`xx,xx,xxx`) with a per-account
 * reveal. Default on, and it stays on by default — this only makes the setting
 * reachable.
 *
 * A real `role="switch"`: the state is the whole point of the control, and a
 * plain button would announce nothing about whether masking is on.
 */
export function PrivacyModeToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    const next = !on;
    setOn(next); // optimistic: the switch must not lag the tap
    startTransition(async () => {
      try {
        await setPrivacyMode(next);
        router.refresh();
      } catch {
        setOn(!next); // the write failed; don't leave the switch lying
      }
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Privacy mode"
      disabled={pending}
      onClick={toggle}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
        on ? "bg-primary" : "bg-input",
        pending && "opacity-60",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block size-4 rounded-full bg-background transition-transform",
          on ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}
