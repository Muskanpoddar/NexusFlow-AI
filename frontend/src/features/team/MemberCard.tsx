
import { Mail, Pencil, Trash2, FolderKanban } from "lucide-react";
import { formatRole } from "../auth/authService";
import type { TeamMember, TeamProject } from "./MemberModal";

interface MemberCardProps {
  member: TeamMember;
  projects: TeamProject[];
  onEdit: (member: TeamMember) => void;
  onDelete: (member: TeamMember) => void;
}

const roleStyles: Record<TeamMember["role"], string> = {
  OWNER: "bg-amber-50 text-amber-700",
  ADMIN: "bg-violet-50 text-violet-700",
  MANAGER: "bg-blue-50 text-blue-700",
  MEMBER: "bg-slate-100 text-slate-600",
};

function MemberCard({
  member,
  projects,
  onEdit,
  onDelete,
}: MemberCardProps) {
  const initials = member.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const assignedProjects = projects.filter((project) =>
    member.projectIds.includes(project.id)
  );

  return (
    <div className="group h-full rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-200/50">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-700 transition-transform duration-200 group-hover:scale-105">
            {initials}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 transition-colors duration-200 group-hover:text-indigo-700">
              {member.name}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">Team member</p>
          </div>
        </div>

        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onEdit(member)}
            aria-label={`Edit ${member.name}`}
            className="rounded-lg p-2 text-slate-400 transition-colors duration-200 hover:bg-indigo-50 hover:text-indigo-600"
          >
            <Pencil size={16} />
          </button>
          {/* The workspace owner can never be removed. */}
          {member.role !== "OWNER" && (
            <button
              type="button"
              onClick={() => onDelete(member)}
              aria-label={`Remove ${member.name}`}
              className="rounded-lg p-2 text-slate-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
        <Mail size={15} />
        <span className="truncate">{member.email}</span>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${roleStyles[member.role]}`}
        >
          {formatRole(member.role)}
        </span>
        <span className="text-xs text-slate-400">
          Joined {member.joinedAt}
        </span>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
          <FolderKanban size={14} />
          PROJECTS ({assignedProjects.length})
        </div>
        <div className="flex flex-wrap gap-1.5">
          {assignedProjects.length > 0 ? (
            assignedProjects.map((project) => (
              <span
                key={project.id}
                className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs text-slate-600 transition-colors duration-200 group-hover:bg-indigo-50 group-hover:text-indigo-700"
              >
                {project.name}
              </span>
            ))
          ) : (
            <span className="text-xs text-amber-600">
              Not assigned to any project
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default MemberCard;
