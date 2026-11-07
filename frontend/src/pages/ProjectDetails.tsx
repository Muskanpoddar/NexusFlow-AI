
import { useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Users,
  Plus,
  Pencil,
  Trash2,
  FolderKanban,
  Circle,
  UserRound,
} from "lucide-react";

import { useWorkspace } from "../hooks/useWorkspace";
import { formatRole } from "../features/auth/authService";
import TaskModal, {
  type TaskFormData,
} from "../features/tasks/TaskModal";
import type { Task } from "../types/task";
import type { Project } from "../types/project";

interface ProjectDetailsProps {
  projectId: string;
  onBack: () => void;
}

function formatDate(date: string) {
  if (!date) return "No due date";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Health is derived from the project status and its computed task progress.
function getHealth(progress: number, status: Project["status"]) {
  if (status === "Completed" || progress === 100) {
    return { label: "Delivered", className: "bg-emerald-50 text-emerald-700" };
  }

  if (progress >= 50) {
    return { label: "On track", className: "bg-emerald-50 text-emerald-700" };
  }

  if (progress > 0) {
    return { label: "At risk", className: "bg-amber-50 text-amber-700" };
  }

  return { label: "No progress", className: "bg-slate-100 text-slate-600" };
}

function ProjectDetails({ projectId, onBack }: ProjectDetailsProps) {
  const {
    projects,
    members,
    updateProject,
    createTask,
    updateTask,
    deleteTask,
    getProjectProgress,
    getProjectTasks,
    getProjectMembers,
    assignMemberToProject,
    removeMemberFromProject,
  } = useWorkspace();

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Get project and related data
  const project = projects.find((item) => item.id === projectId);
  const projectTasks = getProjectTasks(projectId);
  const projectMembers = getProjectMembers(projectId);
  const progress = getProjectProgress(projectId);

  // Handle missing project only after all hooks have executed
  if (!project) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <FolderKanban size={36} className="mx-auto text-slate-300" />

        <h2 className="mt-4 font-semibold text-slate-800">
          Project not found
        </h2>

        <button
          onClick={onBack}
          className="mt-4 text-sm font-semibold text-blue-600"
        >
          Back to projects
        </button>
      </div>
    );
  }

  const completedTasks = projectTasks.filter(
    (task) => task.status === "Done"
  ).length;

  const ownerId = project.ownerId;

  const todoTasks = projectTasks.filter(
    (task) => task.status === "To Do"
  ).length;

  const inProgressTasks = projectTasks.filter(
    (task) => task.status === "In Progress"
  ).length;

  const health = getHealth(progress, project.status);

  const statusStyles = {
    Planning: "bg-amber-50 text-amber-700",
    Active: "bg-blue-50 text-blue-700",
    "On Hold": "bg-slate-100 text-slate-600",
    Completed: "bg-emerald-50 text-emerald-700",
  };

  const taskStatusStyles = {
    "To Do": "bg-slate-100 text-slate-600",
    "In Progress": "bg-blue-50 text-blue-700",
    Done: "bg-emerald-50 text-emerald-700",
  };

  function openCreateTask() {
    setEditingTask(null);
    setTaskModalOpen(true);
  }

  function openEditTask(task: Task) {
    setEditingTask(task);
    setTaskModalOpen(true);
  }

  function saveTask(data: TaskFormData) {
    if (editingTask) {
      updateTask(editingTask.id, data);
    } else {
      createTask(data);
    }

    setTaskModalOpen(false);
    setEditingTask(null);
  }

  function handleDeleteTask(taskId: string) {
    if (window.confirm("Are you sure you want to delete this task?")) {
      deleteTask(taskId);
    }
  }

  function toggleMember(memberId: string) {
    const assigned = projectMembers.some((member) => member.id === memberId);

    if (assigned) {
      // The backend keeps the owner attached to their own project.
      if (memberId === ownerId) return;

      removeMemberFromProject(projectId, memberId);
    } else {
      assignMemberToProject(projectId, memberId);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <button
        onClick={onBack}
        className="group animate-fade-in flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors duration-200 hover:text-blue-600"
      >
        <ArrowLeft
          size={17}
          className="transition-transform duration-200 group-hover:-translate-x-0.5"
        />
        Back to projects
      </button>

      {/* Project overview */}
      <section className="animate-slide-up rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600 transition-transform duration-200 hover:scale-105">
              <FolderKanban size={25} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {project.name}
                </h1>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[project.status]}`}
                >
                  {project.status}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${health.className}`}
                >
                  {health.label}
                </span>
              </div>

              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
                {project.description || "No description provided."}
              </p>

              <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
                <span>{project.category}</span>
                <span>Priority: {project.priority}</span>

                <span className="flex items-center gap-1">
                  <CalendarDays size={13} />
                  Due {formatDate(project.dueDate)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() =>
              updateProject(project.id, {
                status: project.status === "Active" ? "On Hold" : "Active",
              })
            }
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm"
          >
            {project.status === "Active" ? "Put on hold" : "Mark active"}
          </button>
        </div>

        {/* Progress */}
        <div className="mt-8 border-t border-slate-100 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Overall progress
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Based on completed project tasks
              </p>
            </div>

            <span className="text-2xl font-bold tabular-nums text-blue-600">
              {progress}%
            </span>
          </div>

          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-linear-to-r from-blue-600 to-violet-500 transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Tasks",
            value: projectTasks.length,
            icon: Circle,
            color: "text-blue-600",
            background: "bg-blue-50",
          },
          {
            label: "Completed",
            value: completedTasks,
            icon: CheckCircle2,
            color: "text-emerald-600",
            background: "bg-emerald-50",
          },
          {
            label: "In Progress",
            value: inProgressTasks,
            icon: Clock3,
            color: "text-amber-600",
            background: "bg-amber-50",
          },
          {
            label: "Team Members",
            value: projectMembers.length,
            icon: Users,
            color: "text-violet-600",
            background: "bg-violet-50",
          },
        ].map((stat, index) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="animate-slide-up rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{ animationDelay: `${120 + index * 70}ms` }}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{stat.label}</p>

                <div
                  className={`rounded-lg p-2 transition-transform duration-200 ${stat.background}`}
                >
                  <Icon size={19} className={stat.color} />
                </div>
              </div>

              <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">
                {stat.value}
              </p>
            </div>
          );
        })}
      </section>

      {/* Tasks and team */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section
          className="animate-slide-up overflow-hidden rounded-xl border border-slate-200 bg-white xl:col-span-2"
          style={{ animationDelay: "260ms" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
            <div>
              <h2 className="font-semibold text-slate-900">
                Project Tasks
                <span className="ml-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium tabular-nums text-slate-500">
                  {projectTasks.length}
                </span>
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {todoTasks} to do · {inProgressTasks} in progress · {completedTasks} completed
              </p>
            </div>

            <button
              onClick={openCreateTask}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-sm active:translate-y-0"
            >
              <Plus size={16} />
              Add Task
            </button>
          </div>

          {projectTasks.length === 0 ? (
            <div className="animate-pop-in px-5 py-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
                <CheckCircle2 size={28} className="text-slate-300" />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-800">
                No tasks in this project
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Add a task to start tracking project progress.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {projectTasks.map((task, index) => {
                const assignee = members.find(
                  (member) => member.id === task.assigneeId
                );

                return (
                  <div
                    key={task.id}
                    className="animate-fade-in flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition-colors duration-200 hover:bg-slate-50"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">
                        {task.title}
                      </p>

                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                        {task.description || "No description"}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <CalendarDays size={12} />
                          {formatDate(task.dueDate)}
                        </span>

                        <span className="flex items-center gap-1">
                          <UserRound size={12} />
                          {assignee?.name ?? "Unassigned"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        aria-label={`Status for ${task.title}`}
                        value={task.status}
                        onChange={(event) =>
                          updateTask(task.id, {
                            status: event.target.value as Task["status"],
                          })
                        }
                        className={`rounded-full border-0 px-3 py-1.5 text-xs font-semibold outline-none transition-opacity duration-200 ${taskStatusStyles[task.status]}`}
                      >
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Done">Done</option>
                      </select>

                      <button
                        onClick={() => openEditTask(task)}
                        aria-label={`Edit ${task.title}`}
                        className="rounded-lg p-2 text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-blue-600"
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        aria-label={`Delete ${task.title}`}
                        className="rounded-lg p-2 text-slate-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Project team */}
        <section
          className="animate-slide-up overflow-hidden rounded-xl border border-slate-200 bg-white"
          style={{ animationDelay: "320ms" }}
        >
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-semibold text-slate-900">
              Project Team
              <span className="ml-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium tabular-nums text-slate-500">
                {projectMembers.length}
              </span>
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Manage members assigned to this project
            </p>
          </div>

          <div className="space-y-3 p-5">
            {members.length === 0 ? (
              <p className="text-sm text-slate-500">
                No workspace members available.
              </p>
            ) : (
              members.map((member) => {
                const assigned = project.memberIds.includes(member.id);

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                        {member.name
                          .split(/\s+/)
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {member.name}
                        </p>

                        <p className="truncate text-xs text-slate-400">
                          {formatRole(member.role)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleMember(member.id)}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                        assigned
                          ? "bg-blue-50 text-blue-700 hover:bg-red-50 hover:text-red-600"
                          : "border border-slate-200 text-slate-500 hover:border-blue-200 hover:bg-blue-50/60 hover:text-blue-600"
                      }`}
                    >
                      {assigned ? "Assigned" : "Add"}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Task modal */}
      {taskModalOpen && (
        <TaskModal
          task={editingTask}
          projects={[project]}
          members={members}
          onClose={() => {
            setTaskModalOpen(false);
            setEditingTask(null);
          }}
          onSave={saveTask}
        />
      )}
    </div>
  );
}

export default ProjectDetails;
