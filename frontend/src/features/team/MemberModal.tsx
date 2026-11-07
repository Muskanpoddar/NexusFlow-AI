import { useEffect, useState, type FormEvent } from "react";
import { X, FolderKanban, Save } from "lucide-react";

import { formatRole } from "../auth/authService";
import type { MemberRole } from "../../types/team";

export type { MemberRole };

export interface TeamProject {
  id: string;
  name: string;
  color: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  joinedAt: string;
  projectIds: string[];
}

interface MemberModalProps {
  member: TeamMember;
  projects: TeamProject[];
  serverError?: string;
  onClose: () => void;
  onSave: (member: Omit<TeamMember, "id" | "joinedAt">) => void;
}

function MemberModal({
  member,
  projects,
  serverError,
  onClose,
  onSave,
}: MemberModalProps) {
  const [role, setRole] = useState<MemberRole>(member.role);
  const [projectIds, setProjectIds] = useState<string[]>(member.projectIds);

  useEffect(() => {
    setRole(member.role);
    setProjectIds(member.projectIds);
  }, [member]);

  const toggleProject = (projectId: string) => {
    setProjectIds((current) =>
      current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [...current, projectId]
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    onSave({
      name: member.name,
      email: member.email,
      role,
      projectIds,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Edit team member
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Change the role and the project assignments.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {serverError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {serverError}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Full name
              </label>

              <input
                value={member.name}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm read-only:bg-slate-50"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Email address
              </label>

              <input
                value={member.email}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm read-only:bg-slate-50"
              />

              <p className="mt-1.5 text-xs text-slate-400">
                Name and email come from the member's own account.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Role
              </label>

              {member.role === "OWNER" ? (
                <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <span className="font-medium">
                    {formatRole(member.role)}
                  </span>

                  <span className="text-xs text-slate-400">
                    The owner role cannot be changed.
                  </span>
                </div>
              ) : (
                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as MemberRole)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="ADMIN">{formatRole("ADMIN")}</option>
                  <option value="MANAGER">{formatRole("MANAGER")}</option>
                  <option value="MEMBER">{formatRole("MEMBER")}</option>
                </select>
              )}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <FolderKanban size={17} className="text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-800">
                Assign to projects
              </h3>
              <span className="text-xs text-slate-400">
                ({projectIds.length} selected)
              </span>
            </div>

            <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
              {projects.map((project) => (
                <label
                  key={project.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg p-2.5 transition hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={projectIds.includes(project.id)}
                    onChange={() => toggleProject(project.id)}
                    className="h-4 w-4 accent-indigo-600"
                  />
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="text-sm font-medium text-slate-700">
                    {project.name}
                  </span>
                </label>
              ))}
              {projects.length === 0 && (
                <p className="p-3 text-sm text-slate-500">
                  No projects are available yet.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Save size={16} />
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MemberModal;
