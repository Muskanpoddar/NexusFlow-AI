
import { ArrowUpRight, FolderKanban } from "lucide-react";
import { useWorkspace } from "../../hooks/useWorkspace";
import type { ProjectStatus } from "../../types/project";

function formatDate(date: string) {
  if (!date) return "No due date";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusStyle(status: ProjectStatus) {
  switch (status) {
    case "Active":
      return "bg-blue-50 text-blue-700";
    case "Completed":
      return "bg-emerald-50 text-emerald-700";
    case "Planning":
      return "bg-amber-50 text-amber-700";
    case "On Hold":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function RecentProjects() {
  const { projects, getProjectProgress, getProjectMembers } =
    useWorkspace();

  const recentProjects = [...projects]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 p-5">
        <div>
          <h3 className="font-semibold text-slate-900">
            Recent Projects
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Track your team's latest work
          </p>
        </div>

        <div className="flex items-center gap-1 text-sm font-medium text-slate-400">
          Latest projects
          <ArrowUpRight
            size={16}
            className="transition-transform duration-200 hover:translate-x-0.5 hover:-translate-y-0.5"
          />
        </div>
      </div>

      {recentProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-14 text-center animate-pop-in">
          <div className="rounded-xl bg-slate-100 p-3">
            <FolderKanban size={25} className="text-slate-400" />
          </div>

          <h4 className="mt-4 text-sm font-semibold text-slate-800">
            No projects yet
          </h4>

          <p className="mt-1 max-w-xs text-xs text-slate-500">
            Create your first project to start tracking your team's work.
          </p>
        </div>
      ) : (
        <div className="scrollbar-slim overflow-x-auto">
          <table className="w-full min-w-[650px] text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-4 font-medium">Project</th>
                <th className="px-5 py-4 font-medium">Progress</th>
                <th className="px-5 py-4 font-medium">Team</th>
                <th className="px-5 py-4 font-medium">Due Date</th>
                <th className="px-5 py-4 font-medium">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {recentProjects.map((project, index) => {
                const progress = getProjectProgress(project.id);
                const projectMembers = getProjectMembers(project.id);

                return (
                  <tr
                    key={project.id}
                    className="animate-fade-in transition-colors duration-200 hover:bg-slate-50"
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-800">
                        {project.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {project.category}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blue-500 transition-all duration-700 ease-out"
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>

                        <span className="text-xs font-medium tabular-nums text-slate-600">
                          {progress}%
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {projectMembers.length > 0 ? (
                        <div className="flex -space-x-2">
                          {projectMembers.slice(0, 4).map((member) => (
                            <div
                              key={member.id}
                              title={member.name}
                              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[10px] font-semibold text-slate-700 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-blue-100 hover:text-blue-700"
                            >
                              {getInitials(member.name)}
                            </div>
                          ))}

                          {projectMembers.length > 4 && (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-semibold text-slate-600">
                              +{projectMembers.length - 4}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          No members
                        </span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                      {formatDate(project.dueDate)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${getStatusStyle(project.status)}`}
                      >
                        {project.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default RecentProjects;
