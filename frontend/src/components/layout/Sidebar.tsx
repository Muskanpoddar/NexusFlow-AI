
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Bot,
  Users,
  Settings,
  HelpCircle,
  Zap,
} from "lucide-react";

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

const navigation = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Projects", icon: FolderKanban },
  { name: "My Tasks", icon: CheckSquare },
  { name: "AI Assistant", icon: Bot },
];

const managementNavigation = [
  { name: "Team Members", icon: Users },
  { name: "Settings", icon: Settings },
];

function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const renderNavigation = (
    items: typeof navigation,
    startIndex = 0
  ) => (
    <nav className="space-y-1">
      {items.map((item, index) => {
        const Icon = item.icon;
        const isActive = activePage === item.name;

        return (
          <button
            key={item.name}
            onClick={() => onNavigate(item.name)}
            aria-current={isActive ? "page" : undefined}
            className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 animate-fade-in ${
              isActive
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
            style={{ animationDelay: `${(startIndex + index) * 45}ms` }}
          >
            <span
              aria-hidden="true"
              className={`absolute -left-1 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full transition-all duration-200 ${
                isActive
                  ? "scale-y-100 bg-white/90 opacity-100"
                  : "scale-y-0 bg-blue-400 opacity-0 group-hover:scale-y-100 group-hover:opacity-60"
              }`}
            />

            <Icon
              size={19}
              className="shrink-0 transition-transform duration-200 group-hover:scale-110"
            />
            {item.name}
          </button>
        );
      })}
    </nav>
  );

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-slate-300">

      <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-6 animate-fade-in">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20 transition-transform duration-200 hover:scale-105">
          <Zap size={22} className="text-white" />
        </div>

        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">
            NexusFlow
          </h1>
          <p className="text-xs text-slate-500">
            AI Workspace
          </p>
        </div>
      </div>

      <div className="scrollbar-slim flex-1 overflow-y-auto px-4 py-6">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Workspace
        </p>

        {renderNavigation(navigation)}

        <p className="mb-3 mt-9 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Management
        </p>

        {renderNavigation(managementNavigation, navigation.length)}
      </div>

      <div className="border-t border-slate-800 p-4">
        <button className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition-all duration-200 hover:bg-slate-800 hover:text-white">
          <HelpCircle
            size={19}
            className="shrink-0 transition-transform duration-200 group-hover:scale-110"
          />
          Help & Support
        </button>

        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-3 transition-colors duration-200 hover:border-blue-900/60">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-blue-400" />
            <span className="text-sm font-semibold text-white">
              NexusFlow AI
            </span>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Work smarter with intelligent project management.
          </p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
