type RatingChangeBadgeProps = {

  delta?: number | null;

  size?: "sm" | "md";

};



function formatDeltaValue(delta: number): string {

  const abs = Math.abs(delta);

  return Number.isInteger(abs) ? String(abs) : abs.toFixed(1);

}



export default function RatingChangeBadge({

  delta,

  size = "sm",

}: RatingChangeBadgeProps) {

  if (delta == null || delta === 0) return null;



  const isUp = delta > 0;

  const textSize = size === "sm" ? "text-[10px]" : "text-xs";



  return (

    <span

      className={`inline-flex items-center gap-0.5 rounded-md px-1 py-0.5 font-extrabold leading-none ring-1 ${textSize} ${

        isUp
          ? "bg-emerald-400/12 text-emerald-300 ring-emerald-400/25"
          : "bg-red-400/12 text-red-300 ring-red-400/25"

      }`}

      title={isUp ? "Рейтинг вырос" : "Рейтинг упал"}

    >

      <span aria-hidden>{isUp ? "\u2191" : "\u2193"}</span>

      <span>{formatDeltaValue(delta)}</span>

    </span>

  );

}


