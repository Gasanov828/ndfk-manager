type StatCardProps = {
  label: string;
  value: string | number;
  icon: string;
  accent?: "blue" | "purple";
};

export default function StatCard({
  label,
  value,
  icon,
  accent = "blue",
}: StatCardProps) {
  const accentClass =
    accent === "purple"
      ? "from-violet-500/20 to-purple-600/10 ring-violet-400/20"
      : "from-blue-500/20 to-cyan-600/10 ring-cyan-400/20";

  const valueClass =
    accent === "purple" ? "neon-text-purple text-violet-200" : "neon-text-blue text-cyan-200";

  return (
    <div
      className={`glass-panel flex items-center gap-4 rounded-2xl bg-gradient-to-br p-5 ring-1 ${accentClass}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/30 text-2xl">
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className={`text-3xl font-extrabold ${valueClass}`}>{value}</p>
      </div>
    </div>
  );
}
