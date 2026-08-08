import Link from "next/link";
import ClubLogoSvg from "@/components/ClubLogoSvg";
import { getFirstName } from "@/lib/playerStats";

export default function MobilePlayerHeader({
  displayName,
}: {
  displayName: string;
}) {
  const firstName = getFirstName(displayName);

  return (
    <div className="mobile-top-header mb-1 md:hidden">
      <Link
        href="/me"
        className="flex min-w-0 flex-1 items-center gap-2.5 px-1 py-0.5"
      >
        <ClubLogoSvg size="md" idPrefix="mobile-player-header" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-extrabold text-white">
            {firstName}
          </p>
          <p className="truncate text-[10px] text-slate-500">Мой профиль</p>
        </div>
      </Link>
    </div>
  );
}
