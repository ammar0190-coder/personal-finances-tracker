import type { ReactNode } from "react";

/**
 * One setting: what it is on the left, the control on the right. Hairlines and
 * type carry the structure, not a container — D-17 keeps the card a
 * Dashboard-only device.
 */
export function SettingsRow({
  label,
  description,
  control,
}: {
  label: string;
  description?: ReactNode;
  control: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-border/60 py-5">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-sm font-medium">{label}</span>
        {description && (
          <span className="text-xs leading-relaxed text-muted-foreground">{description}</span>
        )}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
