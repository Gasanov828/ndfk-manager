import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: string;
  extra?: ReactNode;
  className?: string;
};

export default function PageHeader({
  title,
  subtitle,
  icon = "⚽",
  extra,
  className,
}: PageHeaderProps) {
  return (
    <div className={className ?? "mb-3 sm:mb-6"}>
      <div className="flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-600/20 text-xl ring-1 ring-white/10 sm:h-12 sm:w-12 sm:rounded-2xl sm:text-2xl">
            {icon}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl lg:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 text-[11px] text-slate-400 sm:text-sm">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {extra && <div className="w-full shrink-0 lg:w-auto">{extra}</div>}
      </div>
    </div>
  );
}
