import Link from "next/link";
import ClubLogoSvg from "@/components/ClubLogoSvg";

type ClubHeroBrandProps = {
  href?: string;
  tag?: string;
  fullBleed?: boolean;
};

export default function ClubHeroBrand({
  href = "/",
  tag = "ФК · главная",
  fullBleed = true,
}: ClubHeroBrandProps) {
  const panel = (
    <div
      className={`club-hero-brand__panel ${fullBleed ? "club-hero-brand__panel--bleed" : ""}`}
    >
      <div className="club-hero-brand__row">
        <ClubLogoSvg
          size="lg"
          idPrefix="club-hero-brand-logo"
          className="club-hero-brand__logo"
        />
        <div className="club-hero-brand__copy">
          <div className="club-hero-brand__name-wrap club-hero-brand__name-shell">
            <p className="club-hero-brand__name">Нижний Дженгутай</p>
            <p className="club-hero-brand__name-mirror" aria-hidden>
              Нижний Дженгутай
            </p>
          </div>
          {tag ? <p className="club-hero-brand__tag">{tag}</p> : null}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="club-hero-brand">
        {panel}
      </Link>
    );
  }

  return <div className="club-hero-brand">{panel}</div>;
}
