/**
 * PRD §10.11's per-user timezone, as something a picker can actually show.
 *
 * The bug this was written for: `Intl.supportedValuesOf("timeZone")` returns
 * the runtime's own spelling of each zone, which on this Node is the LEGACY
 * alias — `Asia/Calcutta`, not `Asia/Kolkata`; `Europe/Kiev`, not
 * `Europe/Kyiv`. The schema's default is `Asia/Kolkata`
 * (20260828120000_initial_schema.sql), and a browser reports `Asia/Kolkata`
 * too, so the stored value matches no option in the list.
 *
 * A native <select> whose value matches no option silently displays its FIRST
 * option instead. Every user would have opened Settings, seen "Africa/Abidjan"
 * presented as their timezone, and overwritten a correct setting by touching
 * anything else on the row.
 */
import { describe, expect, it } from "vitest";
import { SUPPORTED_TIMEZONES, canonicalTimezone, timezoneOptions } from "@/lib/timezones";

describe("canonicalTimezone", () => {
  it("maps a modern IANA name onto the spelling this runtime lists", () => {
    expect(canonicalTimezone("Asia/Kolkata")).toBe(canonicalTimezone("Asia/Calcutta"));
    expect(SUPPORTED_TIMEZONES).toContain(canonicalTimezone("Asia/Kolkata"));
  });

  it("leaves a name the runtime already lists alone", () => {
    expect(canonicalTimezone("Europe/London")).toBe("Europe/London");
  });

  it("returns an unrecognisable value unchanged rather than throwing", () => {
    // Better to show a person their stored oddity than to crash Settings.
    expect(canonicalTimezone("Mars/Olympus_Mons")).toBe("Mars/Olympus_Mons");
  });
});

describe("timezoneOptions", () => {
  it("always contains the zone currently stored, so the select cannot misreport it", () => {
    expect(timezoneOptions("Asia/Kolkata")).toContain(canonicalTimezone("Asia/Kolkata"));
  });

  it("keeps a stored zone the runtime does not know rather than dropping it", () => {
    expect(timezoneOptions("Mars/Olympus_Mons")).toContain("Mars/Olympus_Mons");
  });

  it("offers the full list, not just the current zone", () => {
    expect(timezoneOptions("Europe/London").length).toBeGreaterThan(100);
  });

  it("lists each zone once", () => {
    const options = timezoneOptions("Asia/Calcutta");
    expect(options.length).toBe(new Set(options).size);
  });
});
