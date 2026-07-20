export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 bg-black/20 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-4 py-5 sm:flex-row sm:px-6 lg:px-8">
        <div className="text-center sm:text-left">
          <p className="text-sm font-semibold text-white/90">ФК Нижний Дженгутай</p>
          <p className="text-xs text-slate-400">Футбол — наша жизнь</p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="#"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-bold text-slate-300 transition hover:border-blue-400/40 hover:bg-blue-500/10"
            aria-label="VK"
          >
            VK
          </a>
          <a
            href="#"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-bold text-slate-300 transition hover:border-blue-400/40 hover:bg-blue-500/10"
            aria-label="Telegram"
          >
            TG
          </a>
          <a
            href="#"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-bold text-slate-300 transition hover:border-blue-400/40 hover:bg-blue-500/10"
            aria-label="YouTube"
          >
            YT
          </a>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">Тёмная тема</span>
          <div
            className="relative h-6 w-11 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 p-0.5"
            aria-hidden
          >
            <div className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-md" />
          </div>
        </div>
      </div>
    </footer>
  );
}
