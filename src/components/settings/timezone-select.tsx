"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTimezone } from "@/lib/actions/settings";
import { canonicalTimezone, timezoneOptions } from "@/lib/timezones";

/**
 * PRD §10.11: timestamps are stored UTC and displayed in the user's own zone.
 *
 * A native <select>, not the styled combobox used elsewhere: there are several
 * hundred zones, and the platform's own picker (with type-ahead, and a full
 * -screen wheel on a phone) beats anything hand-rolled at that length.
 */
export function TimezoneSelect({ timezone }: { timezone: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  // The stored spelling may differ from the runtime's; an unmatched value
  // would make the select quietly display its first option instead.
  const current = canonicalTimezone(timezone);

  return (
    <select
      aria-label="Timezone"
      defaultValue={current}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(async () => {
          await setTimezone(next);
          router.refresh();
        });
      }}
      className="max-w-[12rem] rounded-md border border-input bg-background px-2.5 py-1.5 text-xs disabled:opacity-60"
    >
      {timezoneOptions(timezone).map((tz) => (
        <option key={tz} value={tz}>
          {tz}
        </option>
      ))}
    </select>
  );
}
