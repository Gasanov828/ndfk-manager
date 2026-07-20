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

      className={`inline-flex items-center gap-0.5 font-bold ${textSize} ${

        isUp ? "text-emerald-400" : "text-red-400"

      }`}

      title={isUp ? "Рейтинг вырос" : "Рейтинг упал"}

    >

      <span aria-hidden>{isUp ? "↑" : "↓"}</span>

      <span>{formatDeltaValue(delta)}</span>

    </span>

  );

}


