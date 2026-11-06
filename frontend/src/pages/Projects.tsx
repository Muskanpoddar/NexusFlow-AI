
import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  FolderOpen,
  SlidersHorizontal,
} from "lucide-react";

import ProjectCard from "../features/projects/ProjectCard";
import ProjectModal, {
  type ProjectFormData,
} from "../features/projects/ProjectModal";
import { useWorkspace } from "../hooks/useWorkspace";
import type { Project } from "../types/project";

interface ProjectsProps {
  onOpenProject: (id: string) => void;
}

function Projects({ onOpenProject }: ProjectsProps) {
  const {
    projects,
    members,
    createProject,
    updateProject,
    deleteProject,
  } = useWorkspace();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const searchTerm = search.toLowerCase();

      const matchesSearch =
        project.name.toLowerCase().includes(searchTerm) ||
        project.description.toLowerCase().includes(searchTerm);

      const matchesStatus =
        statusFilter === "All" || project.status === statusFilter;

      const matchesCategory =
        categoryFilter === "All" || project.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [projects, search, statusFilter, categoryFilter]);

  function openCreateModal() {
    setEditingProject(null);
    setModalOpen(true);
  }

  function openEditModal(project: Project) {
    setEditingProject(project);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingProject(null);
  }

  function saveProject(data: ProjectFormData) {
    if (editingProject) {
      updateProject(editingProject.id, data);
    } else {
      const owner =
        members.find((member) => member.role === "Admin") ?? members[0];

      createProject({
        ...data,
        startDate: new Date().toISOString().slice(0, 10),
        ownerId: owner?.id ?? "",
        memberIds: owner ? [owner.id] : [],
      });
    }

    closeModal();
  }

  function handleDeleteProject(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this project? Its associated tasks will also be deleted."
    );

    if (confirmed) {
      deleteProject(id);
    }
  }

  const summary = [
    { label: "Total Projects", value: projects.length },
    {
      label: "Active",
      value: projects.filter((project) => project.status === "Active").length,
    },
    {
      label: "Completed",
      value: projects.filter((project) => project.status === "Completed").length,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <section className="flex flex-wrap items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Projects
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Organize, manage and track your workspace projects.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md active:translate-y-0"
        >
          <Plus size={18} />
          Create Project
        </button>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summary.map((item, index) => (
          <div
            key={item.label}
            className="animate-slide-up rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      <section className="animate-slide-up flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between" style={{ animationDelay: "220ms" }}>
        <div className="relative w-full lg:max-w-sm">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SlidersHorizontal size={17} className="text-slate-400" />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none transition-colors duration-200 hover:border-slate-300"
          >
            <option value="All">All statuses</option>
            <option value="Planning">Planning</option>
            <option value="Active">Active</option>
            <option value="On Hold">On Hold</option>
            <option value="Completed">Completed</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none transition-colors duration-200 hover:border-slate-300"
          >
            <option value="All">All categories</option>
            <option value="Development">Development</option>
            <option value="Design">Design</option>
            <option value="Marketing">Marketing</option>
            <option value="Research">Research</option>
            <option value="Mobile">Mobile</option>
            <option value="AI">AI</option>
            <option value="Other">Other</option>
          </select>

          <div className="flex rounded-lg border border-slate-200 p-1">
            <button
              onClick={() => setView("grid")}
              aria-label="Grid view"
              className={`rounded-md p-2 transition-all duration-200 ${
                view === "grid"
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

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">
            All Projects
            <span className="ml-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium tabular-nums text-slate-500">
              {filteredProjects.length}
            </span>
          </h2>
        </div>

        {filteredProjects.length > 0 ? (
          <div
            className={
              view === "grid"
                ? "grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
                : "flex flex-col gap-4"
            }
          >
            {filteredProjects.map((project, index) => (
              <div
                key={project.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <ProjectCard
                  project={project}
                  onEdit={openEditModal}
                  onDelete={handleDeleteProject}
                  onOpen={onOpenProject}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="animate-pop-in rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
              <FolderOpen size={30} className="text-slate-300" />
            </div>
            <h3 className="mt-4 font-semibold text-slate-800">
              No projects found
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Try changing your search or filters, or create a project.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md"
            >
              <Plus size={16} />
              Create a project
            </button>
          </div>
        )}
      </section>

      {modalOpen && (
        <ProjectModal
          project={editingProject}
          onClose={closeModal}
          onSave={saveProject}
        />
      )}
    </div>
  );
}

export default Projects;
