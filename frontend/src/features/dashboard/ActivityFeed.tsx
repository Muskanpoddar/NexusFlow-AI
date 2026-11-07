
import {
  Building2,
  FolderKanban,
  ListChecks,
  Users,
  type LucideIcon,
} from "lucide-react";

import { useWorkspace } from "../../hooks/useWorkspace";
import type { ActivityType } from "../../types/activity";

const TYPE_STYLES: Partial<
  Record<ActivityType, { icon: LucideIcon; className: string }>
> = {
  PROJECT_CREATED: {
    icon: FolderKanban,
    className: "bg-blue-50 text-blue-600",
  },
  PROJECT_UPDATED: {
    icon: FolderKanban,
    className: "bg-blue-50 text-blue-600",
  },
  PROJECT_DELETED: {
    icon: FolderKanban,
    className: "bg-blue-50 text-blue-600",
  },
  PROJECT_MEMBER_ADDED: {
    icon: FolderKanban,
    className: "bg-blue-50 text-blue-600",
  },
  PROJECT_MEMBER_REMOVED: {
    icon: FolderKanban,
    className: "bg-blue-50 text-blue-600",
  },
  TASK_CREATED: {
    icon: ListChecks,
    className: "bg-violet-50 text-violet-600",
  },
  TASK_UPDATED: {
    icon: ListChecks,
    className: "bg-violet-50 text-violet-600",
  },
  TASK_COMPLETED: {
    icon: ListChecks,
    className: "bg-violet-50 text-violet-600",
  },
  TASK_DELETED: {
    icon: ListChecks,
    className: "bg-violet-50 text-violet-600",
  },
  WORKSPACE_CREATED: {
    icon: Building2,
    className: "bg-indigo-50 text-indigo-600",
  },
  WORKSPACE_MEMBER_ADDED: {
    icon: Users,
    className: "bg-emerald-50 text-emerald-600",
  },
  WORKSPACE_MEMBER_ROLE_UPDATED: {
    icon: Users,
    className: "bg-emerald-50 text-emerald-600",
  },
  WORKSPACE_MEMBER_REMOVED: {
    icon: Users,
    className: "bg-emerald-50 text-emerald-600",
  },
};

function timeAgo(value: string) {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) return "";

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";

  const minutes = Math.round(seconds / 60);

  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);

  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);

  if (days < 30) return `${days}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function ActivityFeed() {
  const { activities } = useWorkspace();

  const recent = [...activities]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 8);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 p-5">
        <div>
          <h3 className="font-semibold text-slate-900">Activity Feed</h3>

          <p className="mt-1 text-xs text-slate-500">
            What happened in this workspace lately
          </p>
        </div>
      </div>

      {recent.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-14 text-center animate-pop-in">
          <div className="rounded-xl bg-slate-100 p-3">
            <ListChecks size={25} className="text-slate-400" />
          </div>

          <h4 className="mt-4 text-sm font-semibold text-slate-800">
            No activity yet
          </h4>

          <p className="mt-1 max-w-xs text-xs text-slate-500">
            Project, task and team changes show up here as they happen.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {recent.map((activity, index) => {
            const style = TYPE_STYLES[activity.type] ?? {
              icon: ListChecks,
              className: "bg-slate-100 text-slate-600",
            };

            const Icon = style.icon;

            return (
              <li
                key={activity.id}
                className="animate-fade-in flex items-start gap-3 px-5 py-4 transition-colors duration-200 hover:bg-slate-50"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.className}`}
                >
                  <Icon size={15} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700">
                    {activity.actorName && (
                      <span className="font-semibold text-slate-900">
                        {activity.actorName}{" "}
                      </span>
                    )}

                    {activity.message}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {timeAgo(activity.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default ActivityFeed;
