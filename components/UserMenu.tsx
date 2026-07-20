"use client";



import Link from "next/link";

import { usePathname, useRouter } from "next/navigation";

import { useEffect, useRef, useState } from "react";

import { logoutViaApi } from "@/lib/playerAuth";

import { useAuthProfile } from "@/hooks/useAuthProfile";

import { useMobileOverlayLock } from "@/hooks/useMobileOverlay";



import { ADMIN_NAV_ITEMS } from "@/lib/adminNav";

const ADMIN_ITEMS = ADMIN_NAV_ITEMS;



export default function UserMenu() {

  const pathname = usePathname();

  const router = useRouter();

  const [open, setOpen] = useState(false);

  const { user, profile, isAdmin, ensureProfile, loading } = useAuthProfile();

  const [ensuring, setEnsuring] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const ignoreOutsideUntilRef = useRef(0);



  useEffect(() => {

    setOpen(false);

  }, [pathname]);



  useEffect(() => {

    if (!open) return;



    ignoreOutsideUntilRef.current = Date.now() + 250;



    const handlePointerOutside = (event: PointerEvent) => {

      if (Date.now() < ignoreOutsideUntilRef.current) return;

      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {

        setOpen(false);

      }

    };



    const handleEscape = (event: KeyboardEvent) => {

      if (event.key === "Escape") setOpen(false);

    };



    document.addEventListener("pointerdown", handlePointerOutside);

    document.addEventListener("keydown", handleEscape);



    return () => {

      document.removeEventListener("pointerdown", handlePointerOutside);

      document.removeEventListener("keydown", handleEscape);

    };

  }, [open]);



  async function handleLogout() {

    await logoutViaApi();

    setOpen(false);

    router.push("/");

    router.refresh();

  }



  function toggleMenu() {

    setOpen((value) => !value);

  }



  const displayName = isAdmin

    ? (user?.email?.split("@")[0] ?? "Админ")

    : (profile?.player_name ?? user?.email?.split("@")[0] ?? "Игрок");

  const initial = displayName.charAt(0).toUpperCase();

  const isAdminActive = pathname.startsWith("/admin");



  useMobileOverlayLock(open);



  return (

    <div ref={menuRef} className={`relative shrink-0 ${open ? "z-[120]" : "z-50"}`}>

      <button

        type="button"

        onClick={toggleMenu}

        aria-expanded={open}

        aria-haspopup="menu"

        aria-label={user ? `Профиль: ${displayName}` : "Вход и профиль"}

        className={`flex touch-target items-center gap-1.5 rounded-xl border px-2 py-2 transition md:gap-2 md:px-3 ${

          open || isAdminActive

            ? "border-violet-400/30 bg-violet-500/10 text-white"

            : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10"

        }`}

      >

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-600 text-sm font-bold sm:h-8 sm:w-8">

          {initial}

        </div>

        <span className="hidden max-w-[100px] truncate text-sm font-medium sm:inline">

          {user ? displayName : "Гость"}

        </span>

        <span

          className={`hidden text-xs text-slate-500 transition-transform sm:inline ${open ? "rotate-180" : ""}`}

        >

          ▾

        </span>

      </button>



      {open && (

        <>

          <button

            type="button"

            aria-label="Закрыть меню"

            className="fixed inset-0 z-[115] bg-black/60 md:hidden"

            onClick={() => setOpen(false)}

          />

          <div

            role="menu"

            className="bottom-nav-safe fixed inset-x-0 bottom-0 z-[116] max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-slate-950/98 py-2 pb-6 shadow-[0_-8px_48px_rgba(0,0,0,0.55)] backdrop-blur-xl md:absolute md:inset-auto md:right-0 md:top-[calc(100%+8px)] md:z-50 md:max-h-none md:w-56 md:rounded-2xl md:pb-2 md:shadow-[0_16px_48px_rgba(0,0,0,0.55)]"

          >

            <div className="mb-1 flex items-center justify-between border-b border-white/5 px-4 py-3 md:hidden">

              <p className="text-sm font-semibold text-white">{displayName}</p>

              <button

                type="button"

                onClick={() => setOpen(false)}

                className="touch-target rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-white/10"

              >

                ✕

              </button>

            </div>

            <div className="hidden border-b border-white/5 px-4 py-3 md:block">

              <p className="truncate text-sm font-semibold text-white">

                {displayName}

              </p>

              <p className="text-xs text-slate-400">

                {!user

                  ? "Просмотр без входа"

                  : isAdmin

                    ? "Админ · ФК"

                    : profile

                      ? "Игрок · ФК"

                      : "Вход без профиля"}

              </p>

            </div>



            {!user && (

              <div className="border-b border-white/5 px-2 py-2">

                <p className="px-2 pb-2 text-[11px] text-slate-500">

                  Зрители без регистрации. Игроки — по ссылке, вход по email.

                </p>

                <Link

                  href="/player/login"

                  role="menuitem"

                  onClick={() => setOpen(false)}

                  className="flex touch-target items-center gap-2 rounded-xl px-3 py-3 text-sm text-emerald-200 hover:bg-emerald-500/10 active:bg-emerald-500/15"

                >

                  <span>⚽</span>

                  Вход игрока

                </Link>

                <Link

                  href="/login"

                  role="menuitem"

                  onClick={() => setOpen(false)}

                  className="mt-1 flex touch-target items-center gap-2 rounded-xl px-3 py-3 text-sm text-violet-200 hover:bg-violet-500/10 active:bg-violet-500/15"

                >

                  <span>🔐</span>

                  Вход админа

                </Link>

              </div>

            )}



            {user && !isAdmin && (

              <div className="border-b border-white/5 px-2 py-2">

                <p className="px-2 py-1 text-[11px] text-amber-200/90">

                  {profile

                    ? "Роль: игрок. Админка только у капитана."

                    : "Профиль не создан. Нажмите кнопку ниже или выполните fix_profile_access.sql в Supabase."}

                </p>

                {!profile && (

                  <button

                    type="button"

                    disabled={ensuring || loading}

                    onClick={async () => {

                      setEnsuring(true);

                      await ensureProfile();

                      setEnsuring(false);

                      router.refresh();

                    }}

                    className="mt-1 flex w-full touch-target items-center gap-2 rounded-xl bg-violet-500/15 px-3 py-3 text-sm text-violet-200 hover:bg-violet-500/25 disabled:opacity-50"

                  >

                    <span>✨</span>

                    {ensuring ? "Создаём..." : "Создать профиль"}

                  </button>

                )}

              </div>

            )}



            {isAdmin && (

              <div className="border-b border-white/5 px-2 py-2">

                <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">

                  Админка

                </p>

                {ADMIN_ITEMS.map(({ href, label, icon }) => {

                  const isActive = pathname === href;



                  return (

                    <Link

                      key={href}

                      href={href}

                      role="menuitem"

                      onClick={() => setOpen(false)}

                      className={`flex touch-target items-center gap-2 rounded-xl px-3 py-3 text-sm transition ${

                        isActive

                          ? "bg-red-500/15 text-red-200"

                          : "text-slate-300 hover:bg-white/5 hover:text-white active:bg-white/10"

                      }`}

                    >

                      <span>{icon}</span>

                      {label}

                    </Link>

                  );

                })}

              </div>

            )}



            {user && (

              <div className="px-2 py-2">

                <button

                  type="button"

                  role="menuitem"

                  onClick={handleLogout}

                  className="flex w-full touch-target items-center gap-2 rounded-xl px-3 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white active:bg-white/10"

                >

                  <span>🚪</span>

                  Выйти

                </button>

              </div>

            )}

          </div>

        </>

      )}

    </div>

  );

}


