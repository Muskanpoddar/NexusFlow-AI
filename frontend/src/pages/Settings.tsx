
import { useState } from "react";
import {
  Bell,
  Building2,
  KeyRound,
  LogOut,
  Save,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import { formatRole } from "../features/auth/authService";

interface Preferences {
  emailDigest: boolean;
  taskReminders: boolean;
  aiSuggestions: boolean;
  compactTables: boolean;
}

const PREFERENCES_KEY = "nexusflow-preferences";

const defaultPreferences: Preferences = {
  emailDigest: true,
  taskReminders: true,
  aiSuggestions: true,
  compactTables: false,
};

function readPreferences(): Preferences {
  try {
    const saved = localStorage.getItem(PREFERENCES_KEY);

    if (saved) {
      return { ...defaultPreferences, ...JSON.parse(saved) };
    }
  } catch {
    console.warn("Could not read saved preferences.");
  }

  return defaultPreferences;
}

const toggles: { key: keyof Preferences; title: string; hint: string }[] = [
  {
    key: "emailDigest",
    title: "Weekly progress digest",
    hint: "A Monday summary of project health and team load.",
  },
  {
    key: "taskReminders",
    title: "Task due reminders",
    hint: "Notify me before a task I own reaches its deadline.",
  },
  {
    key: "aiSuggestions",
    title: "AI suggestions",
    hint: "Let the assistant propose next steps inside every report.",
  },
  {
    key: "compactTables",
    title: "Compact tables",
    hint: "Show more rows per screen in task and team lists.",
  },
];

interface SettingsProps {
  onOpenProfile: () => void;
}

function Settings({ onOpenProfile }: SettingsProps) {
  const { user, logout } = useAuth();
  const [preferences, setPreferences] = useState(readPreferences);
  const [saved, setSaved] = useState(false);

  function handleToggle(key: keyof Preferences) {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
    setSaved(false);
  }

  function handleSave() {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    setSaved(true);
  }

  const workspace = user?.workspaces[0];

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <div className="animate-fade-in">
        <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
          <span>Workspace</span>
          <span>/</span>
          <span className="text-indigo-600">Settings</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Settings
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Control your account, workspace and notification preferences.
        </p>
      </div>

      <section className="animate-slide-up rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <User size={17} className="text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-800">Account</h2>
        </div>

        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Name", value: user?.name ?? "—" },
            { label: "Email", value: user?.email ?? "—" },
            { label: "Role", value: formatRole(workspace?.role ?? "MEMBER") },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
            >
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {item.label}
              </dt>

              <dd className="mt-1 truncate text-sm font-semibold text-slate-800">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="animate-slide-up rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" style={{ animationDelay: "80ms" }}>
        <div className="flex items-center gap-2">
          <Building2 size={17} className="text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-800">Workspace</h2>
        </div>

        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Workspace", value: workspace?.workspace.name ?? "—" },
            { label: "Identifier", value: workspace?.workspace.slug ?? "—" },
            {
              label: "Workspaces",
              value: `${user?.workspaces.length ?? 0} joined`,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
            >
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {item.label}
              </dt>

              <dd className="mt-1 truncate text-sm font-semibold text-slate-800">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="animate-slide-up rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" style={{ animationDelay: "160ms" }}>
        <div className="flex items-center gap-2">
          <Bell size={17} className="text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-800">
            Notifications
          </h2>
        </div>

        <ul className="mt-4 divide-y divide-slate-100">
          {toggles.map((toggle) => (
            <li
              key={toggle.key}
              className="flex items-center justify-between gap-4 py-3.5"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {toggle.title}
                </p>

                <p className="mt-0.5 text-xs text-slate-500">{toggle.hint}</p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={preferences[toggle.key]}
                aria-label={toggle.title}
                onClick={() => handleToggle(toggle.key)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
                  preferences[toggle.key] ? "bg-indigo-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${
                    preferences[toggle.key] ? "left-5.5" : "left-0.5"
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <Save size={15} />
            Save preferences
          </button>

          {saved && (
            <span className="animate-pop-in text-sm text-emerald-600">
              Preferences saved on this device.
            </span>
          )}
        </div>
      </section>

      <section className="animate-slide-up rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" style={{ animationDelay: "240ms" }}>
        <div className="flex items-center gap-2">
          <ShieldCheck size={17} className="text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-800">Security</h2>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3.5">
          <div className="flex items-start gap-3">
            <KeyRound size={18} className="mt-0.5 text-slate-400" />

            <div>
              <p className="text-sm font-medium text-slate-800">
                Password
              </p>

              <p className="mt-0.5 text-xs text-slate-500">
                Change your password from the profile page.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenProfile}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
          >
            Open profile
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-100 bg-red-50/60 px-4 py-3.5">
          <div className="flex items-start gap-3">
            <LogOut size={18} className="mt-0.5 text-red-500" />

            <div>
              <p className="text-sm font-medium text-slate-800">
                Sign out
              </p>

              <p className="mt-0.5 text-xs text-slate-500">
                Ends this session on this device.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-sm ring-1 ring-red-200 transition hover:bg-red-50"
          >
            Sign out
          </button>
        </div>
      </section>

      <p className="flex items-center justify-center gap-2 text-xs text-slate-400">
        <Sparkles size={13} />
        NexusFlow AI settings are managed per workspace by an admin.
      </p>
    </div>
  );
}

export default Settings;
