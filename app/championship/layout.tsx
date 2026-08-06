import ChampionshipHeader from "@/components/championship/ChampionshipHeader";
import ChampionshipSideNav from "@/components/championship/ChampionshipSideNav";
import { getActiveChampionshipBundle } from "@/lib/championship/server";

export const dynamic = "force-dynamic";

export default async function ChampionshipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data, error, schemaMissing } = await getActiveChampionshipBundle();

  return (
    <div className="tournament-app tournament-enter -mx-3 px-3 sm:-mx-4 sm:px-4">
      <ChampionshipHeader championship={data?.championship ?? null} />
      {error ? (
        <p
          className={`mb-2 rounded-lg border px-2.5 py-1.5 text-[10px] ${
            schemaMissing
              ? "border-amber-400/30 bg-amber-500/10 text-amber-100"
              : "border-white/10 bg-white/[0.03] text-slate-400"
          }`}
        >
          {error}
        </p>
      ) : null}
      <div className="flex items-start gap-2 sm:gap-3">
        <ChampionshipSideNav />
        <div className="tournament-page-body min-w-0 flex-1 pb-2">{children}</div>
      </div>
    </div>
  );
}
