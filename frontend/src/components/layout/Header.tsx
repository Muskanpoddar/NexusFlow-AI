
import { useMemo, useState, type FormEvent } from "react";
import {
  Bell,
  Building2,
  Check,
  ChevronDown,
  FolderKanban,
  ListChecks,
  LogOut,
  Plus,
  Search,
  Settings,
  User,
  UserRound,
} from "lucide-react";

import { useAuth } from "../../hooks/useAuth";
import { useWorkspace } from "../../hooks/useWorkspace";
import { formatRole } from "../../features/auth/authService";
import ActivityFeed from "../../features/dashboard/ActivityFeed";

interface HeaderProps {
  pageTitle: string;
  onNavigate: (page: string) => void;
  onOpenProject: (id: string) => void;
}

interface SearchHit {
  id: string;
  label: string;
  hint: string;
  kind: "project" | "task" | "member";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function Header({ pageTitle, onNavigate, onOpenProject }: HeaderProps) {
  const { user, logout } = useAuth();
  const {
    workspaces,
    currentWorkspace,
    switchWorkspace,
    createWorkspace,
    projects,
    tasks,
    members,
    activities,
  } = useWorkspace();
  const [menuOpen, setMenuOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceError, setWorkspaceError] = useState("");
  const [query, setQuery] = useState("");

  // The dot marks the activity that arrived since the panel was opened.
  const seenKey = `nexusflow-activity-seen-${currentWorkspace?.id ?? "none"}`;
  const [lastSeenAt, setLastSeenAt] = useState(() =>
    Number(localStorage.getItem(seenKey) ?? 0)
  );

  const latestActivityAt = useMemo(
    () =>
      activities.reduce((latest, activity) => {
        const time = Date.parse(activity.createdAt);

        return Number.isNaN(time) ? latest : Math.max(latest, time);
      }, 0),
    [activities]
  );

  const hasUnreadActivity = latestActivityAt > lastSeenAt;

  const name = user?.name ?? "Guest";
  const firstName = name.split(" ")[0];
  const role = formatRole(currentWorkspace?.role ?? "MEMBER");

  const hits = useMemo<SearchHit[]>(() => {
    const term = query.trim().toLowerCase();

    if (term.length < 2) return [];

    const projectHits = projects
      .filter(
        (project) =>
          project.name.toLowerCase().includes(term) ||
          project.description.toLowerCase().includes(term)
      )
      .slice(0, 4)
      .map((project) => ({
        id: project.id,
        label: project.name,
        hint: `Project · ${project.status}`,
        kind: "project" as const,
      }));

    const taskHits = tasks
      .filter((task) => task.title.toLowerCase().includes(term))
      .slice(0, 4)
      .map((task) => ({
        id: task.projectId,
        label: task.title,
        hint: "Task",
        kind: "task" as const,
      }));

    const memberHits = members
      .filter(
        (member) =>
          member.name.toLowerCase().includes(term) ||
          member.email.toLowerCase().includes(term)
      )
      .slice(0, 3)
      .map((member) => ({
        id: member.id,
        label: member.name,
        hint: "Team member",
        kind: "member" as const,
      }));

    return [...projectHits, ...taskHits, ...memberHits].slice(0, 8);
  }, [query, projects, tasks, members]);

  const openPage = (page: string) => {
    setMenuOpen(false);
    onNavigate(page);
  };

  function selectWorkspace(id: string) {
    setWorkspaceOpen(false);
    switchWorkspace(id);

    // Every workspace keeps its own seen marker.
    setLastSeenAt(
      Number(
        localStorage.getItem(`nexusflow-activity-seen-${id}`) ?? 0
      )
    );
  }

  function openHit(hit: SearchHit) {
    setQuery("");

    if (hit.kind === "member") {
      openPage("Team Members");
      return;
    }

    onOpenProject(hit.id);
  }

  function toggleNotifications() {
    const next = !notificationsOpen;

    setNotificationsOpen(next);

    if (next) {
      // Opening the panel marks the activity as seen.
      setLastSeenAt(latestActivityAt);
      localStorage.setItem(seenKey, String(latestActivityAt));
    }
  }

  async function submitWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = workspaceName.trim();

    if (trimmed.length < 2) {
      setWorkspaceError("The workspace name needs at least two characters.");
      return;
    }

    setWorkspaceError("");

    try {
      await createWorkspace(trimmed);

      setWorkspaceName("");
      setCreatingWorkspace(false);
      setWorkspaceOpen(false);
    } catch (error) {
      setWorkspaceError(
        error instanceof Error
          ? error.message
          : "The workspace could not be created."
      );
    }
  }

  return (
    <header className="sticky top-0 z-10 flex min-h-20 items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-5 shadow-sm shadow-slate-200/40 backdrop-blur-md sm:px-8">

      <div className="animate-fade-in">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          {pageTitle}
        </h2>
        <p className="hidden text-sm text-slate-500 sm:block">
          Welcome back, {firstName}! Here's what's happening today.
        </p>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">

        {workspaces.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setWorkspaceOpen((current) => !current)}
              aria-expanded={workspaceOpen}
              aria-haspopup="listbox"
              className="flex max-w-48 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50/60 sm:max-w-64"
            >
              <Building2 size={16} className="shrink-0 text-indigo-600" />

              <span className="truncate">
                {currentWorkspace?.name ?? "Select workspace"}
              </span>

              <ChevronDown
                size={15}
                className={`shrink-0 text-slate-400 transition-transform duration-200 ${
                  workspaceOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {workspaceOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setWorkspaceOpen(false)}
                />

                <div className="absolute left-0 top-full z-20 mt-2 w-64 animate-pop-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
                  <ul role="listbox" className="py-1">
                    {workspaces.map((workspace) => (
                      <li key={workspace.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={workspace.id === currentWorkspace?.id}
                          onClick={() => selectWorkspace(workspace.id)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-800">
                              {workspace.name}
                            </span>

                            <span className="block truncate text-xs text-slate-400">
                              {formatRole(workspace.role)}
                            </span>
                          </span>

                          {workspace.id === currentWorkspace?.id && (
                            <Check
                              size={16}
                              className="shrink-0 text-blue-600"
                            />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>

                  <div className="border-t border-slate-100 p-3">
                    {creatingWorkspace ? (
                      <form onSubmit={submitWorkspace} className="space-y-2">
                        <input
                          autoFocus
                          value={workspaceName}
                          onChange={(event) =>
                            setWorkspaceName(event.target.value)
                          }
                          placeholder="Workspace name"
                          aria-label="Workspace name"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />

                        {workspaceError && (
                          <p className="text-xs text-red-600">
                            {workspaceError}
                          </p>
                        )}

                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                          >
                            Create
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setCreatingWorkspace(false);
                              setWorkspaceError("");
                            }}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setCreatingWorkspace(true);
                          setWorkspaceError("");
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-sm font-semibold text-blue-600 transition hover:text-blue-700"
                      >
                        <Plus size={15} />
                        Create workspace
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <div className="relative hidden md:block">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search anything..."
            aria-label="Search projects, tasks and members"
            className="w-56 rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all duration-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 lg:w-64"
          />

          {hits.length > 0 && (
            <ul className="absolute right-0 top-full z-20 mt-2 w-72 animate-pop-in overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-200/60">
              {hits.map((hit) => {
                const Icon =
                  hit.kind === "project"
                    ? FolderKanban
                    : hit.kind === "task"
                      ? ListChecks
                      : UserRound;

                return (
                  <li key={`${hit.kind}-${hit.id}-${hit.label}`}>
                    <button
                      type="button"
                      onClick={() => openHit(hit)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-slate-50"
                    >
                      <Icon
                        size={15}
                        className="shrink-0 text-slate-400"
                      />

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-slate-800">
                          {hit.label}
                        </span>

                        <span className="block truncate text-xs text-slate-400">
                          {hit.hint}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
            onClick={toggleNotifications}
            className="group relative rounded-lg p-2 text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 active:scale-95"
          >
            <Bell
              size={21}
              className="transition-transform duration-200 group-hover:-rotate-6"
            />

            {hasUnreadActivity && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse-soft rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>

          {notificationsOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setNotificationsOpen(false)}
              />

              <div className="absolute right-0 top-full z-20 mt-2 w-80 animate-pop-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
                <ActivityFeed />

                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen(false);
                    onNavigate("Overview");
                  }}
                  className="w-full border-t border-slate-100 px-4 py-3 text-sm font-semibold text-blue-600 transition hover:bg-slate-50"
                >
                  View all activity
                </button>
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            aria-expanded={menuOpen}
            className="group flex items-center gap-2 border-l border-slate-200 py-1 pl-3 pr-2 transition-opacity duration-200 hover:opacity-90 sm:gap-3 sm:pl-5 sm:pr-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 transition-transform duration-200 group-hover:scale-105">
              {initials(name)}
            </div>

            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {name}
              </p>
              <p className="text-xs text-slate-500">
                {role}
              </p>
            </div>

            <ChevronDown
              size={16}
              className="hidden text-slate-400 transition-transform duration-200 group-hover:translate-y-0.5 sm:block"
            />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />

              <div className="absolute right-0 top-full z-20 mt-2 w-60 animate-pop-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {name}
                  </p>

                  <p className="truncate text-xs text-slate-500">
                    {user?.email}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => openPage("Profile")}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <User size={16} className="text-slate-400" />
                  My profile
                </button>

                <button
                  type="button"
                  onClick={() => openPage("Settings")}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <Settings size={16} className="text-slate-400" />
                  Settings
                </button>

                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
