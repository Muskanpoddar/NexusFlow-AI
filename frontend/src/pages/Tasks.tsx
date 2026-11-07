
import { useMemo, useState } from "react";

import {
  Plus,
  Search,
  LayoutGrid,
  List,
  ClipboardList,
  CheckCircle2,
  Clock,
  CircleDashed,
  CalendarDays,
  Pencil,
  Trash2,
} from "lucide-react";

import TaskCard from "../features/tasks/TaskCard";
import TaskModal, {
  type TaskFormData,
} from "../features/tasks/TaskModal";
import { useWorkspace } from "../hooks/useWorkspace";
import type { Task, TaskStatus } from "../types/task";

const columns: {
  title: TaskStatus;
  icon: typeof CircleDashed;
  color: string;
  background: string;
}[] = [
  {
    title: "To Do",
    icon: CircleDashed,
    color: "text-slate-500",
    background: "bg-slate-100",
  },
  {
    title: "In Progress",
    icon: Clock,
    color: "text-blue-600",
    background: "bg-blue-50",
  },
  {
    title: "Done",
    icon: CheckCircle2,
    color: "text-emerald-600",
    background: "bg-emerald-50",
  },
];

function Tasks() {
  const {
    tasks,
    projects,
    members,
    createTask,
    updateTask,
    deleteTask,
  } = useWorkspace();

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [view, setView] = useState<"board" | "list">("board");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState("");

  const projectMap = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects]
  );

  const memberMap = useMemo(
    () => new Map(members.map((member) => [member.id, member.name])),
    [members]
  );

  const filteredTasks = useMemo(() => {
    const query = search.toLowerCase();

    return tasks.filter((task) => {
      const projectName = projectMap.get(task.projectId) ?? "";

      const matchesSearch =
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        projectName.toLowerCase().includes(query);

      const matchesPriority =
        priorityFilter === "All" || task.priority === priorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [tasks, search, priorityFilter, projectMap]);

  const counts = {
    total: tasks.length,
    todo: tasks.filter((task) => task.status === "To Do").length,
    progress: tasks.filter((task) => task.status === "In Progress").length,
    done: tasks.filter((task) => task.status === "Done").length,
  };

  const summary = [
    {
      label: "Total Tasks",
      value: counts.total,
      icon: ClipboardList,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "To Do",
      value: counts.todo,
      icon: CircleDashed,
      color: "text-slate-600",
      bg: "bg-slate-100",
    },
    {
      label: "In Progress",
      value: counts.progress,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Completed",
      value: counts.done,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
  ];

  function openCreateModal() {
    setEditingTask(null);
    setModalOpen(true);
  }

  function openEditModal(task: Task) {
    setEditingTask(task);
    setModalOpen(true);
  }

  function closeModal() {
    if (isSaving) return;

    setModalOpen(false);
    setEditingTask(null);
  }

  async function saveTask(data: TaskFormData) {
    if (isSaving) return;

    setIsSaving(true);
    setPageError("");

    try {
      if (editingTask) {
        await updateTask(editingTask.id, data);
      } else {
        await createTask(data);
      }

      setModalOpen(false);
      setEditingTask(null);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to save the task. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteTask(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmed) return;

    setPageError("");

    try {
      await deleteTask(id);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to delete the task. Please try again."
      );
    }
  }

  async function changeStatus(id: string, status: TaskStatus) {
    setPageError("");

    try {
      await updateTask(id, { status });
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to update the task status. Please try again."
      );
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  const overdueCount = tasks.filter(
    (task) => task.status !== "Done" && task.dueDate < today
  ).length;

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <section className="flex flex-wrap items-center justify-between gap-4 animate-fade-in">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              My Tasks
            </h1>

            {overdueCount > 0 && (
              <span className="animate-pop-in rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">
                {overdueCount} overdue
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Manage assignments, organize priorities and track progress.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md active:translate-y-0"
        >
          <Plus size={18} />
          Create Task
        </button>
      </section>

      {pageError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </p>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.map((item, index) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="animate-slide-up rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{item.label}</p>

                <div
                  className={`rounded-lg p-2 transition-transform duration-200 ${item.bg}`}
                >
                  <Icon size={19} className={item.color} />
                </div>
              </div>

              <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">
                {item.value}
              </p>
            </div>
          );
        })}
      </section>

      <section
        className="animate-slide-up flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
        style={{ animationDelay: "220ms" }}
      >
        <div className="relative w-full md:max-w-sm">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks or projects..."
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="animate-pop-in rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none transition-colors duration-200 hover:border-slate-300"
            style={{ animationDelay: "120ms" }}
          >
            <option value="All">All priorities</option>
            <option value="Urgent">Urgent priority</option>
            <option value="High">High priority</option>
            <option value="Medium">Medium priority</option>
            <option value="Low">Low priority</option>
          </select>

          <div
            className="flex animate-pop-in rounded-lg border border-slate-200 p-1"
            style={{ animationDelay: "180ms" }}
          >
            <button
              onClick={() => setView("board")}
              aria-label="Board view"
              className={`rounded-md p-2 transition-all duration-200 ${
                view === "board"
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              }`}
            >
              <LayoutGrid size={18} />
            </button>

            <button
              onClick={() => setView("list")}
              aria-label="List view"
              className={`rounded-md p-2 transition-all duration-200 ${
                view === "list"
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              }`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </section>

      {view === "board" ? (
        <section className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
          {columns.map((column, columnIndex) => {
            const Icon = column.icon;

            const columnTasks = filteredTasks.filter(
              (task) => task.status === column.title
            );

            return (
              <div
                key={column.title}
                className="animate-slide-up min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 p-4"
                style={{ animationDelay: `${columnIndex * 90}ms` }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`rounded-lg p-2 ${column.background}`}>
                      <Icon size={17} className={column.color} />
                    </div>

                    <h2 className="font-semibold text-slate-800">
                      {column.title}
                    </h2>

                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium tabular-nums text-slate-500">
                      {columnTasks.length}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {columnTasks.map((task, taskIndex) => (
                    <div
                      key={task.id}
                      className="animate-slide-up"
                      style={{
                        animationDelay: `${
                          columnIndex * 90 + taskIndex * 60
                        }ms`,
                      }}
                    >
                      <TaskCard
                        task={task}
                        projectName={
                          projectMap.get(task.projectId) ??
                          "Project unavailable"
                        }
                        assigneeName={
                          task.assigneeId
                            ? memberMap.get(task.assigneeId) ??
                              "Member unavailable"
                            : ""
                        }
                        onEdit={openEditModal}
                        onDelete={handleDeleteTask}
                        onStatusChange={changeStatus}
                      />
                    </div>
                  ))}

                  {columnTasks.length === 0 && (
                    <p className="animate-pop-in rounded-lg border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm text-slate-400">
                      No tasks here
                    </p>
                  )}
                </div>

                <button
                  onClick={openCreateModal}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-500 transition-all duration-200 hover:border-blue-400 hover:bg-white hover:text-blue-600"
                >
                  <Plus size={16} />
                  Add task
                </button>
              </div>
            );
          })}
        </section>
      ) : (
        <section className="animate-slide-up overflow-x-auto rounded-xl border border-slate-200 bg-white scrollbar-slim">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="px-5 py-4 font-medium">Task</th>
                <th className="px-5 py-4 font-medium">Project</th>
                <th className="px-5 py-4 font-medium">Assignee</th>
                <th className="px-5 py-4 font-medium">Priority</th>
                <th className="px-5 py-4 font-medium">Due date</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredTasks.map((task, index) => (
                <tr
                  key={task.id}
                  className="animate-fade-in transition-colors duration-200 hover:bg-slate-50"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-slate-800">
                      {task.title}
                    </p>

                    <p className="mt-1 max-w-52 truncate text-xs text-slate-400">
                      {task.description}
                    </p>
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {projectMap.get(task.projectId) ?? "Unavailable"}
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {task.assigneeId
                      ? memberMap.get(task.assigneeId) ?? "Unavailable"
                      : "Unassigned"}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        task.priority === "High"
                          ? "bg-red-50 text-red-700"
                          : task.priority === "Medium"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {task.priority}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                      <CalendarDays
                        size={14}
                        className="text-slate-400"
                      />
                      {task.dueDate}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <select
                      value={task.status}
                      onChange={(e) =>
                        changeStatus(
                          task.id,
                          e.target.value as TaskStatus
                        )
                      }
                      className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none transition-colors duration-200 focus:border-blue-500"
                    >
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Done">Done</option>
                    </select>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditModal(task)}
                        aria-label="Edit task"
                        className="rounded-md p-2 text-slate-400 transition-colors duration-200 hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        aria-label="Delete task"
                        className="rounded-md p-2 text-slate-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredTasks.length === 0 && (
            <div className="animate-pop-in px-6 py-14 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
                <ClipboardList size={28} className="text-slate-300" />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-800">
                No tasks found
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                No tasks match your search or filters.
              </p>
            </div>
          )}
        </section>
      )}

      {modalOpen && (
        <TaskModal
          task={editingTask}
          projects={projects}
          members={members}
          onClose={closeModal}
          onSave={saveTask}
        />
      )}
    </div>
  );
}

export default Tasks;
