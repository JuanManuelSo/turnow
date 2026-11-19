import type { ReactNode } from "react";

export function DailyMetric({ label, value, detail }: { label: string; value: ReactNode; detail: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 border-b border-border px-1 py-3 last:border-b-0 sm:grid sm:min-h-24 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-x-3 sm:rounded-md sm:border sm:bg-surface sm:px-4 sm:py-3 sm:last:border-b">
      <div className="min-w-0">
        <span className="block text-xs font-semibold text-muted-foreground">{label}</span>
        <small className="mt-1 block text-xs leading-snug text-muted-foreground">{detail}</small>
      </div>
      <strong className="min-w-0 shrink-0 text-right text-lg font-bold tabular-nums tracking-tight text-foreground max-[360px]:text-base sm:break-words sm:text-xl">{value}</strong>
    </div>
  );
}
