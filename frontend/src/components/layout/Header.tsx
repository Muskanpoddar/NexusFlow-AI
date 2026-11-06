
import {
  Search,
  Bell,
  ChevronDown,
} from "lucide-react";

interface HeaderProps {
  pageTitle: string;
}

function Header({ pageTitle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex min-h-20 items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-5 shadow-sm shadow-slate-200/40 backdrop-blur-md sm:px-8">

      <div className="animate-fade-in">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          {pageTitle}
        </h2>
        <p className="hidden text-sm text-slate-500 sm:block">
          Welcome back! Here's what's happening today.
        </p>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">

        <div className="relative hidden md:block">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="search"
            placeholder="Search anything..."
            className="w-56 rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all duration-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 lg:w-64"
          />
        </div>

        <button
          aria-label="Notifications"
          className="group relative rounded-lg p-2 text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 active:scale-95"
        >
          <Bell
            size={21}
            className="transition-transform duration-200 group-hover:-rotate-6"
          />

          <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse-soft rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        <button className="group flex items-center gap-2 border-l border-slate-200 py-1 pl-3 pr-2 transition-opacity duration-200 hover:opacity-90 sm:gap-3 sm:pl-5 sm:pr-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 transition-transform duration-200 group-hover:scale-105">
            MP
          </div>

          <div className="hidden text-left sm:block">
            <p className="text-sm font-semibold text-slate-800">
              Muskan Poddar
            </p>
            <p className="text-xs text-slate-500">
              Workspace Admin
            </p>
          </div>

          <ChevronDown
            size={16}
            className="hidden text-slate-400 transition-transform duration-200 group-hover:translate-y-0.5 sm:block"
          />
        </button>
      </div>
    </header>
  );
}

export default Header;
