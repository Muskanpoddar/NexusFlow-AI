
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  Users,
  Sparkles,
} from "lucide-react";

import { useWorkspace } from "../hooks/useWorkspace";
import StatCard from "../features/dashboard/StatCard";
import ActivityFeed from "../features/dashboard/ActivityFeed";
import RecentProjects from "../features/dashboard/RecentProjects";

function Dashboard() {
  const { projects, tasks, members } = useWorkspace();

  const completedTasks = tasks.filter(
    (task) => task.status === "Done"
  ).length;

  const pendingTasks = tasks.filter(
    (task) => task.status !== "Done"
  ).length;

  const stats = [
    {
      title: "Total Projects",
      value: projects.length,
      description: "Projects in this workspace",
      icon: FolderKanban,
      iconColor: "text-blue-600",
      iconBackground: "bg-blue-50",
    },
    {
      title: "Completed Tasks",
      value: completedTasks,
      description: "Tasks marked as done",
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
      iconBackground: "bg-emerald-50",
    },
    {
      title: "Pending Tasks",
      value: pendingTasks,
      description: "Tasks still in progress",
      icon: Clock,
      iconColor: "text-amber-600",
      iconBackground: "bg-amber-50",
    },
    {
      title: "Team Members",
      value: members.length,
      description: "Members in this workspace",
      icon: Users,
      iconColor: "text-violet-600",
      iconBackground: "bg-violet-50",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="animate-fade-in">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600">
          <Sparkles size={14} className="animate-pulse-soft" />
          Workspace at a glance
        </div>

        <h1 className="mt-2 bg-linear-to-r from-slate-900 via-blue-700 to-violet-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
          Workspace Overview
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Manage your projects and monitor workspace activity.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <div
            key={stat.title}
            className="animate-slide-up"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <StatCard {...stat} />
          </div>
        ))}
      </section>

      <section className="animate-slide-up" style={{ animationDelay: "300ms" }}>
        <RecentProjects />
      </section>

      <section className="animate-slide-up" style={{ animationDelay: "380ms" }}>
        <ActivityFeed />
      </section>
    </div>
  );
}

export default Dashboard;
