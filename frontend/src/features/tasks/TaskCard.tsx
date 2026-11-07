import { useState } from "react";
import { CalendarDays, Pencil, Trash2, UserRound } from "lucide-react";
import type { Task, TaskStatus } from "../../types/task";

interface TaskCardProps {
  task: Task;
  projectName: string;
  assigneeName: string;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}

export default function TaskCard({
  task,
  projectName,
  assigneeName,
  onEdit,
  onDelete,
  onStatusChange,
}: TaskCardProps) {
  const priorityStyles: Record<Task["priority"], string> = {
    Low: "bg-emerald-50 text-emerald-700",
    Medium: "bg-amber-50 text-amber-700",
    High: "bg-red-50 text-red-700",
    Urgent: "bg-red-100 text-red-800",
  };

  const [today] = useState(() => new Date().toISOString().slice(0, 10));

  const isOverdue =
    task.status !== "Done" &&
    Boolean(task.dueDate) &&
    task.dueDate < today;

  return (
    <article className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityStyles[task.priority]}`}
          >
            {task.priority} priority
          </span>

          {isOverdue && (
            <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
              Overdue
            </span>
          )}
        </div>

        <div className="flex gap-1 opacity-70 transition-opacity duration-200 group-hover:opacity-100">
          <button
            onClick={() => onEdit(task)}
            aria-label="Edit task"
            className="rounded-md p-1.5 text-slate-400 transition-colors duration-200 hover:bg-blue-50 hover:text-blue-600"
          >
            <Pencil size={16} />
          </button>

          <button
            onClick={() => onDelete(task.id)}
            aria-label="Delete task"
            className="rounded-md p-1.5 text-slate-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <h3 className="mt-3 font-semibold leading-snug text-slate-900 transition-colors duration-200 group-hover:text-blue-700">
        {task.title}
      </h3>

      <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-relaxed text-slate-500">
        {task.description || "No description provided."}
      </p>

      <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 transition-colors duration-200 group-hover:bg-blue-50/60">
        <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
        <span className="truncate text-xs font-medium text-slate-600">
          {projectName}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <div className="min-w-0">
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <CalendarDays size={13} />
            Due date
          </span>
          <p
            className={`mt-1 text-xs font-medium ${
              isOverdue ? "text-rose-600" : "text-slate-600"
            }`}
          >
            {task.dueDate || "No due date"}
          </p>
        </div>

        <div className="min-w-0 text-right">
          <span className="flex items-center justify-end gap-1 text-xs text-slate-400">
            <UserRound size={13} />
            Assignee
          </span>
          <p className="mt-1 max-w-28 truncate text-xs font-medium text-slate-600">
            {assigneeName || "Unassigned"}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <select
          aria-label={`Change status for ${task.title}`}
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 outline-none transition-colors duration-200 focus:border-blue-500"
        >
          <option value="To Do">To Do</option>
          <option value="In Progress">In Progress</option>
          <option value="Done">Done</option>
        </select>
      </div>
    </article>
  );
}