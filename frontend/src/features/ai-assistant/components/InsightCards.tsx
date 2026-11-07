import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  Clock,
  Flag,
  FolderKanban,
  UserRound,
  UserX,
} from "lucide-react";

import { formatRole } from "../../auth/authService";

import type {
  HealthLevel,
  ProjectInsight,
  ReportSection,
  TaskInsight,
  WorkloadInsight,
  WorkloadLevel,
} from "../aiEngine";

const healthStyles: Record<
  HealthLevel,
  { badge: string; bar: string; label: string }
> = {
  "on-track": {
    badge: "bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-500",
    label: "On track",
  },
  "at-risk": {
    badge: "bg-amber-50 text-amber-700",
    bar: "bg-amber-500",
    label: "At risk",
  },
  critical: {
    badge: "bg-rose-50 text-rose-700",
    bar: "bg-rose-500",
    label: "Critical",
  },
  completed: {
    badge: "bg-blue-50 text-blue-700",
    bar: "bg-blue-500",
    label: "Completed",
  },
};

const flagStyles: Record<string, string> = {
  overdue: "bg-rose-50 text-rose-700",
  high: "bg-violet-50 text-violet-700",
  unassigned: "bg-amber-50 text-amber-700",
  "due-soon": "bg-sky-50 text-sky-700",
};

const flagIcons: Record<string, typeof Flag> = {
  overdue: CircleAlert,
  high: Flag,
  unassigned: UserX,
  "due-soon": Clock,
};

const workloadStyles: Record<
  WorkloadLevel,
  { bar: string; text: string; label: string }
> = {
  overloaded: { bar: "bg-rose-500", text: "text-rose-600", label: "Overloaded" },
  balanced: { bar: "bg-emerald-500", text: "text-emerald-600", label: "Balanced" },
  underloaded: { bar: "bg-sky-500", text: "text-sky-600", label: "Has room" },
  available: { bar: "bg-slate-300", text: "text-slate-500", label: "Available" },
};

interface ProjectHealthCardProps {
  insight: ProjectInsight;
  onOpenProject?: (projectId: string) => void;
}

export function ProjectHealthCard({
  insight,
  onOpenProject,
}: ProjectHealthCardProps) {
  const style = healthStyles[insight.health];

  return (
    <div className="animate-pop-in rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
            <FolderKanban size={16} />
          </span>

          <p className="text-sm font-semibold text-slate-800">
            {insight.name}
          </p>
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.badge}`}
        >
          {style.label}
        </span>
      </div>

      <div className="mt-3.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">
            {insight.completion}% complete
          </span>

          <span className="font-medium text-slate-700">
            {insight.openTasks} open of {insight.totalTasks}
          </span>
        </div>

        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-700 ${style.bar}`}
            style={{ width: `${insight.completion}%` }}
          />
        </div>
      </div>

      {insight.reasons.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {insight.reasons.map((reason) => (
            <li
              key={reason}
              className="flex items-start gap-1.5 text-xs text-slate-500"
            >
              <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-500" />
              {reason}
            </li>
          ))}
        </ul>
      )}

      {onOpenProject && (
        <button
          onClick={() => onOpenProject(insight.id)}
          className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
        >
          Open project
          <ArrowUpRight size={13} />
        </button>
      )}
    </div>
  );
}

interface TaskInsightCardProps {
  insight: TaskInsight;
  onComplete?: (taskId: string) => void;
  onOpenProject?: (projectId: string) => void;
}

export function TaskInsightCard({
  insight,
  onComplete,
  onOpenProject,
}: TaskInsightCardProps) {
  return (
    <div className="animate-pop-in rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-800">
          {insight.title}
        </p>

        <span className="shrink-0 rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-bold text-white">
          {insight.score}
        </span>
      </div>

      <p className="mt-1 text-xs text-slate-500">
        {insight.projectName}
      </p>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {insight.flags.map((flag) => {
          const Icon = flagIcons[flag] ?? Flag;

          return (
            <span
              key={flag}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${flagStyles[flag]}`}
            >
              <Icon size={11} />
              {flag.replace("-", " ")}
            </span>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1">
          <UserRound size={12} />
          {insight.assigneeName ?? "Unassigned"}
        </span>

        <span className="inline-flex items-center gap-1">
          <Clock size={12} />
          {insight.dueDate || "No due date"}
        </span>
      </div>

      {(onComplete || onOpenProject) && (
        <div className="mt-3.5 flex flex-wrap gap-2">
          {onComplete && insight.status !== "Done" && (
            <button
              onClick={() => onComplete(insight.id)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <CheckCircle2 size={13} />
              Mark done
            </button>
          )}

          {onOpenProject && (
            <button
              onClick={() => onOpenProject(insight.projectId)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            >
              Open project
              <ArrowUpRight size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface WorkloadCardProps {
  insight: WorkloadInsight;
}

export function WorkloadCard({ insight }: WorkloadCardProps) {
  const style = workloadStyles[insight.level];

  return (
    <div className="animate-pop-in rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">
            {insight.name}
          </p>

          <p className="mt-0.5 text-xs text-slate-500">
            {formatRole(insight.role)}
          </p>
        </div>

        <span className={`shrink-0 text-xs font-semibold ${style.text}`}>
          {style.label}
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-700 ${style.bar}`}
          style={{ width: `${insight.load}%` }}
        />
      </div>

      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
        <span>{insight.open} open</span>
        <span>{insight.highPriority} high priority</span>
        <span className={insight.overdue > 0 ? "text-rose-500" : ""}>
          {insight.overdue} overdue
        </span>
      </div>
    </div>
  );
}

interface ReportSectionsProps {
  sections: ReportSection[];
}

export function ReportSections({ sections }: ReportSectionsProps) {
  return (
    <div className="space-y-3">
      {sections.map((section, index) => (
        <div
          key={section.heading}
          className="animate-slide-up rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          style={{ animationDelay: `${index * 70}ms` }}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {section.heading}
          </h3>

          <ul className="mt-2.5 space-y-1.5">
            {section.bullets.map((bullet, bulletIndex) => (
              <li
                key={`${section.heading}-${bulletIndex}`}
                className="flex items-start gap-2 text-sm leading-relaxed text-slate-600"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
