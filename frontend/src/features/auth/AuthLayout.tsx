
import type { ReactNode } from "react";
import { Bot, FolderKanban, ShieldCheck, Zap } from "lucide-react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

const highlights = [
  {
    icon: FolderKanban,
    title: "Every project in one place",
    text: "Deadlines, owners and progress tracked live across the workspace.",
  },
  {
    icon: Bot,
    title: "AI that reads your data",
    text: "Ask what is slipping, who is overloaded and what to do next.",
  },
  {
    icon: ShieldCheck,
    title: "Roles you can trust",
    text: "Owner, admin, manager and member access for every team.",
  },
];

function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="relative hidden w-1/2 overflow-hidden bg-linear-to-br from-slate-900 via-blue-900 to-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-500/25 blur-3xl animate-float" />

        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl animate-float" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/30">
            <Zap size={22} className="text-white" />
          </div>

          <div>
            <p className="text-lg font-bold tracking-tight">NexusFlow</p>
            <p className="text-xs text-slate-400">AI Workspace</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            Run your workspace with clarity, not guesswork.
          </h2>

          <div className="mt-8 space-y-5">
            {highlights.map((item, index) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="animate-slide-up flex gap-4"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                    <Icon size={18} className="text-blue-200" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-300">
                      {item.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="relative text-xs text-slate-400">
          © {new Date().getFullYear()} NexusFlow. All rights reserved.
        </p>
      </aside>

      <main className="flex w-full items-center justify-center p-5 sm:p-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/25">
              <Zap size={22} className="text-white" />
            </div>

            <div>
              <p className="text-lg font-bold tracking-tight text-slate-900">
                NexusFlow
              </p>
              <p className="text-xs text-slate-500">AI Workspace</p>
            </div>
          </div>

          <div className="animate-slide-up rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60 sm:p-9">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {title}
            </h1>

            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>

            <div className="mt-7">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AuthLayout;
