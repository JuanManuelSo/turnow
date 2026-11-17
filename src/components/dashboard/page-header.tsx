import type { ReactNode } from "react";

export function PanelHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="panel-head mb-8 max-[900px]:mb-6">
      <div className="panel-head-row flex items-end justify-between gap-6 max-[760px]:flex-col max-[760px]:items-start">
        <div className="panel-head-copy min-w-0">
          <h1 className="text-[clamp(2.1rem,3.4vw,3rem)] leading-[1.02] font-extrabold tracking-[-.06em] text-[#1b2839] max-[600px]:text-[2rem]">
            {title}
          </h1>
          {description && (
            <p className="panel-lede mt-3 max-w-[66ch] text-[.9375rem] leading-[1.55] text-[#56657a] max-[600px]:text-sm">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="panel-head-actions flex flex-wrap items-center gap-2.5 max-[600px]:w-full">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
