"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  SeasonAwardCardState,
  SeasonAwardRarity,
  SeasonPrizesCollection,
} from "@/lib/championship/seasonAwards";
import { RARITY_META } from "@/lib/championship/seasonAwards";
import { getPlayerInitials } from "@/lib/playerPhotos";

const RARITY_ORDER: SeasonAwardRarity[] = [
  "common",
  "rare",
  "epic",
  "legendary",
  "mythical",
];

function formatUnlockDate(iso: string | null): string {
  if (!iso) return "Сезон";
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "Сезон";
  }
}

function ProgressBar({
  current,
  target,
  tone,
}: {
  current: number;
  target: number;
  tone: SeasonAwardRarity;
}) {
  const pct = Math.round((current / Math.max(1, target)) * 100);
  return (
    <div className="space-y-0.5">
      <div className={`prize-progress prize-progress--${tone}`}>
        <div style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-slate-400">
          {current} из {target}
        </span>
        <span className="font-bold text-amber-100/80">{pct}%</span>
      </div>
    </div>
  );
}

function RarityCoverCard({
  rarity,
  unlocked,
  total,
  active,
  onOpen,
}: {
  rarity: SeasonAwardRarity;
  unlocked: number;
  total: number;
  active: boolean;
  onOpen: () => void;
}) {
  const meta = RARITY_META[rarity];
  const pct = Math.round((unlocked / Math.max(1, total)) * 100);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`prize-cover prize-cover--${rarity} ${
        active ? "prize-cover--active" : "prize-cover--side"
      }`}
    >
      <span className="prize-cover__glow" aria-hidden />
      <span className="prize-cover__frame" aria-hidden />
      <div className="prize-cover__body">
        <p className="prize-cover__eyebrow">Категория</p>
        <p className="prize-cover__icon">{meta.icon}</p>
        <h3 className="prize-cover__title">{meta.label}</h3>
        <p className="prize-cover__count">
          {unlocked} / {total} открыто
        </p>
        <div className="prize-cover__bar">
          <div style={{ width: `${pct}%` }} />
        </div>
        <p className="prize-cover__cta">Открыть коллекцию →</p>
      </div>
    </button>
  );
}

function MiniAwardCard({
  card,
  onOpen,
}: {
  card: SeasonAwardCardState;
  onOpen: () => void;
}) {
  const rarity = card.def.rarity;
  const pct = Math.round(
    (card.progress.current / Math.max(1, card.progress.target)) * 100
  );

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`prize-card prize-card--${rarity} ${
        card.unlocked ? "prize-card--open" : "prize-card--locked"
      }`}
    >
      <span className="prize-card__glow" aria-hidden />
      <span className="prize-card__frame" aria-hidden />
      {card.unlocked ? (
        <div className="prize-card__body">
          <span className="prize-card__rarity">
            {RARITY_META[rarity].icon} {RARITY_META[rarity].label}
          </span>
          <span className="prize-card__icon">{card.def.icon}</span>
          <span className="prize-card__title">{card.def.title}</span>
          <span className="prize-card__sub">Открыто</span>
        </div>
      ) : (
        <div className="prize-card__body">
          <span className="prize-card__rarity">
            {RARITY_META[rarity].icon} {RARITY_META[rarity].label}
          </span>
          <span className="prize-card__icon prize-card__icon--dim">
            {card.def.icon}
          </span>
          <span className="prize-card__locked">🔒 Закрыто</span>
          <span className="prize-card__hint">{card.def.hint}</span>
          <div className="prize-card__bar">
            <div style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
    </button>
  );
}

function AwardDetailModal({
  card,
  playerName,
  photoUrl,
  onClose,
}: {
  card: SeasonAwardCardState;
  playerName: string;
  photoUrl: string | null;
  onClose: () => void;
}) {
  const rarity = card.def.rarity;
  const initials = getPlayerInitials(playerName) || "?";
  const isMythic = rarity === "mythical";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="prize-modal" role="dialog" aria-modal="true">
      <button
        type="button"
        className="prize-modal__backdrop"
        aria-label="Закрыть"
        onClick={onClose}
      />
      <div className={`prize-modal__sheet prize-modal__sheet--${rarity}`}>
        <button
          type="button"
          className="prize-modal__close"
          onClick={onClose}
          aria-label="Закрыть"
        >
          ✕
        </button>

        {card.unlocked && isMythic ? (
          <div className="black-gold-player prize-modal__mythic">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/cards/black-gold-card-bg.png"
              alt=""
              className="black-gold-player__bg"
              aria-hidden
            />
            <div className="black-gold-player__vignette" aria-hidden />
            <div className="black-gold-player__photo-wrap">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt={playerName}
                  className="black-gold-player__photo"
                />
              ) : (
                <div className="black-gold-player__photo black-gold-player__photo--empty">
                  <span>{initials}</span>
                </div>
              )}
            </div>
            <div className="black-gold-player__meta">
              <p className="black-gold-card__rarity">Мифическая</p>
              <h3 className="black-gold-player__name">{playerName}</h3>
              <p className="black-gold-player__subtitle">💀 Чёрное Золото</p>
            </div>
          </div>
        ) : (
          <div
            className={`prize-modal__hero prize-modal__hero--${rarity} ${
              card.unlocked ? "prize-modal__hero--open" : ""
            }`}
          >
            <p className="prize-modal__hero-icon">{card.def.icon}</p>
            {card.unlocked ? (
              <>
                <p className="prize-modal__hero-rarity">
                  {RARITY_META[rarity].icon} {RARITY_META[rarity].label}
                </p>
                <h3 className="prize-modal__hero-title">{card.def.title}</h3>
              </>
            ) : (
              <>
                <p className="prize-modal__hero-rarity">
                  {RARITY_META[rarity].icon} {RARITY_META[rarity].label}
                </p>
                <p className="prize-card__locked">🔒 Закрыто</p>
                <p className="prize-modal__hero-hint">{card.def.hint}</p>
              </>
            )}
          </div>
        )}

        <div className="prize-modal__content">
          {card.unlocked ? (
            <>
              <p className="prize-modal__meta">
                {card.unlockedAt
                  ? `Получено · ${formatUnlockDate(card.unlockedAt)}`
                  : "Открыто по статистике сезона (автоматически)"}
              </p>
              <p className="prize-modal__text">{card.def.description}</p>
              <p className="prize-modal__text prize-modal__text--soft">
                {card.def.howTo}
              </p>
            </>
          ) : (
            <>
              <p className="prize-detail__howto-title">Испытание</p>
              <p className="prize-modal__text">{card.def.description}</p>
              <p className="prize-modal__text prize-modal__text--soft">
                {card.def.howTo}
              </p>
              <div className="mt-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Прогресс
                </p>
                <ProgressBar
                  current={card.progress.current}
                  target={card.progress.target}
                  tone={rarity}
                />
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {card.progress.label}
                </p>
              </div>
            </>
          )}

          {card.challenges ? (
            <ul className="mt-3 space-y-1">
              {card.challenges.map((challenge) => (
                <li
                  key={challenge.id}
                  className={`flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-[11px] ring-1 ${
                    challenge.done
                      ? "bg-emerald-500/10 text-emerald-50 ring-emerald-400/25"
                      : "bg-black/20 text-slate-400 ring-white/5"
                  }`}
                >
                  <span className="mt-0.5 w-3.5 shrink-0 text-center font-bold text-emerald-300">
                    {challenge.done ? "✓" : "○"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">
                      {challenge.icon} {challenge.title}
                    </span>
                    <span className="mt-0.5 block opacity-80">
                      {challenge.description}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-amber-200/50">
                      {challenge.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CategoryPackModal({
  rarity,
  cards,
  playerName,
  photoUrl,
  onClose,
}: {
  rarity: SeasonAwardRarity;
  cards: SeasonAwardCardState[];
  playerName: string;
  photoUrl: string | null;
  onClose: () => void;
}) {
  const meta = RARITY_META[rarity];
  const unlocked = cards.filter((c) => c.unlocked).length;
  const [detail, setDetail] = useState<SeasonAwardCardState | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (detail) setDetail(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [detail, onClose]);

  return (
    <>
      <div className="prize-pack" role="dialog" aria-modal="true">
        <button
          type="button"
          className="prize-modal__backdrop"
          aria-label="Закрыть"
          onClick={onClose}
        />
        <div className={`prize-pack__sheet prize-pack__sheet--${rarity}`}>
          <div className="prize-pack__head">
            <button
              type="button"
              className="prize-modal__close prize-modal__close--static"
              onClick={onClose}
              aria-label="Назад"
            >
              ✕
            </button>
            <p className="prize-pack__eyebrow">
              {meta.icon} {meta.label}
            </p>
            <h3 className="prize-pack__title">Коллекция наград</h3>
            <p className="prize-pack__sub">
              {unlocked}/{cards.length} открыто · {playerName}
            </p>
          </div>

          <div
            className={`prize-pack__grid ${
              rarity === "mythical" ? "prize-pack__grid--mythic" : ""
            }`}
          >
            {cards.map((card) => (
              <MiniAwardCard
                key={card.def.code}
                card={card}
                onOpen={() => setDetail(card)}
              />
            ))}
          </div>
        </div>
      </div>

      {detail ? (
        <AwardDetailModal
          card={detail}
          playerName={playerName}
          photoUrl={photoUrl}
          onClose={() => setDetail(null)}
        />
      ) : null}
    </>
  );
}

export default function SeasonPrizesBoard({
  collection,
  viewingHint = null,
  isAdmin = false,
}: {
  collection: SeasonPrizesCollection;
  viewingHint?: string | null;
  isAdmin?: boolean;
}) {
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [openRarity, setOpenRarity] = useState<SeasonAwardRarity | null>(null);
  const [showHint, setShowHint] = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);
  const overallPct = Math.round(
    (collection.unlockedTotal / Math.max(1, collection.total)) * 100
  );

  const cardsByRarity = useMemo(() => {
    const map = {} as Record<SeasonAwardRarity, SeasonAwardCardState[]>;
    for (const rarity of RARITY_ORDER) {
      map[rarity] = collection.cards.filter((c) => c.def.rarity === rarity);
    }
    return map;
  }, [collection.cards]);

  const syncIndexFromScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const slides = Array.from(el.querySelectorAll<HTMLElement>("[data-prize-slide]"));
    if (slides.length === 0) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    slides.forEach((slide, index) => {
      const center = slide.offsetLeft + slide.offsetWidth / 2;
      const dist = Math.abs(center - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = index;
      }
    });
    setCategoryIndex(best);
    if (el.scrollLeft > 12) setShowHint(false);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(syncIndexFromScroll);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    // Центрируем первую карточку
    requestAnimationFrame(() => {
      const first = el.querySelector<HTMLElement>("[data-prize-slide]");
      if (first) {
        const left =
          first.offsetLeft - (el.clientWidth - first.offsetWidth) / 2;
        el.scrollLeft = Math.max(0, left);
      }
      syncIndexFromScroll();
    });
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", onScroll);
    };
  }, [syncIndexFromScroll]);

  const goTo = (index: number) => {
    const el = trackRef.current;
    if (!el) return;
    const slides = el.querySelectorAll<HTMLElement>("[data-prize-slide]");
    const target = slides[index];
    if (!target) return;
    const left =
      target.offsetLeft - (el.clientWidth - target.offsetWidth) / 2;
    el.scrollTo({ left, behavior: "smooth" });
    setCategoryIndex(index);
    setShowHint(false);
  };

  const openCards = openRarity ? cardsByRarity[openRarity] : [];

  return (
    <div className="prize-collection">
      <div className="prize-collection__header">
        <h2 className="text-sm font-bold text-amber-50">🏅 Коллекция сезона</h2>
        <p className="mt-0.5 text-[12px] font-extrabold text-white">
          {collection.playerName}
        </p>
        {viewingHint ? (
          <p className="mt-0.5 text-[10px] text-slate-400">{viewingHint}</p>
        ) : null}
        <p className="mt-1 text-[11px] text-slate-400">
          {collection.unlockedTotal} / {collection.total} наград открыто у{" "}
          <span className="font-semibold text-amber-100/90">
            {collection.playerName}
          </span>
        </p>
        {isAdmin ? (
          <p className="mt-1 text-[10px] leading-snug text-slate-500">
            Награда открывается, когда игрок выполняет условие (например, 1
            матч → «Дебют», гол → «Первый гол»). Нажмите на карточку — увидите
            условие и дату.
          </p>
        ) : null}
        <div className="prize-overall prize-overall--wide mt-1.5">
          <div style={{ width: `${overallPct}%` }} />
        </div>
      </div>

      <div className="prize-peek-wrap">
        <div
          ref={trackRef}
          className="prize-peek"
          aria-label="Категории наград"
        >
          {RARITY_ORDER.map((rarity, index) => {
            const count = collection.counts[rarity];
            return (
              <div
                key={rarity}
                data-prize-slide
                className="prize-peek__slide"
              >
                <RarityCoverCard
                  rarity={rarity}
                  unlocked={count.unlocked}
                  total={count.total}
                  active={index === categoryIndex}
                  onOpen={() => {
                    setShowHint(false);
                    setOpenRarity(rarity);
                  }}
                />
              </div>
            );
          })}
        </div>

        {showHint ? (
          <div className="prize-swipe-hint" aria-hidden>
            <span>Листай ← →</span>
            <span className="prize-swipe-hint__hand">👆</span>
          </div>
        ) : null}
      </div>

      <div className="prize-dots" role="tablist" aria-label="Редкость">
        {RARITY_ORDER.map((rarity, index) => (
          <button
            key={rarity}
            type="button"
            role="tab"
            aria-selected={index === categoryIndex}
            className={`prize-dots__dot prize-dots__dot--${rarity} ${
              index === categoryIndex ? "prize-dots__dot--active" : ""
            }`}
            onClick={() => goTo(index)}
            aria-label={RARITY_META[rarity].label}
          />
        ))}
      </div>

      {openRarity ? (
        <CategoryPackModal
          rarity={openRarity}
          cards={openCards}
          playerName={collection.playerName}
          photoUrl={collection.photoUrl}
          onClose={() => setOpenRarity(null)}
        />
      ) : null}
    </div>
  );
}
