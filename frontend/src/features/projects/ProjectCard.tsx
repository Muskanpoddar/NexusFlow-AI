
import { CalendarDays, Pencil, Trash2, ArrowUpRight } from "lucide-react";
import type { Project } from "../../types/project";

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
}

export default function ProjectCard({
  project,
  onEdit,
  onDelete,
  onOpen,
}: ProjectCardProps) {
  const statusStyles: Record<Project["status"], string> = {
    Planning: "bg-amber-50 text-amber-700",
    Active: "bg-blue-50 text-blue-700",
    "On Hold": "bg-slate-100 text-slate-600",
    Completed: "bg-emerald-50 text-emerald-700",
  };

  const priorityStyles: Record<Project["priority"], string> = {
    Low: "text-emerald-600",
    Medium: "text-amber-600",
    High: "text-red-600",
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(project.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(project.id);
        }
      }}
      className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-200/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="flex items-start justify-between">
        <div className="rounded-lg bg-blue-50 p-3 text-blue-600 transition-transform duration-200 group-hover:scale-105">
          <span className="text-lg font-bold">
            {project.name.charAt(0).toUpperCase()}
          </span>
        </div>

        <div className="flex gap-1">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onEdit(project);
            }}
            aria-label="Edit project"
            className="rounded-lg p-2 text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-blue-600"
          >
            <Pencil size={17} />
          </button>

          <button
            onClick={(event) => {
              event.stopPropagation();
              onDelete(project.id);
            }}
            aria-label="Delete project"
            className="rounded-lg p-2 text-slate-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-slate-900 transition-colors duration-200 group-hover:text-blue-700">
            {project.name}
          </h3>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[project.status]}`}
          >
            {project.status}
          </span>
        </div>

        <p className="mt-2 min-h-10 text-sm leading-relaxed text-slate-500">
          {project.description || "No description provided."}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <div>
          <p className="text-xs text-slate-400">Category</p>
          <p className="mt-1 text-sm font-medium text-slate-700">
            {project.category}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-400">Priority</p>
          <p className={`mt-1 text-sm font-semibold ${priorityStyles[project.priority]}`}>
            {project.priority}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-400">Due date</p>
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-600">
            <CalendarDays size={13} />
            {project.dueDate}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-1 border-t border-slate-100 pt-3 text-xs font-semibold text-blue-600 transition-colors duration-200 group-hover:text-blue-700">
        Open project
        <ArrowUpRight
          size={14}
          className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </div>
    </article>
  );
}
