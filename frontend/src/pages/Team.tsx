
import { useMemo, useState } from "react";
import {
  Users,
  UserCheck,
  FolderKanban,
  UserPlus,
  Search,
  LayoutGrid,
  List,
  BriefcaseBusiness,
  Mail,
  X,
} from "lucide-react";

import { useWorkspace } from "../hooks/useWorkspace";
import { formatRole } from "../features/auth/authService";

import MemberModal, {
  type TeamMember,
  type TeamProject,
  type MemberRole,
} from "../features/team/MemberModal";

import InviteModal from "../features/team/InviteModal";
import MemberCard from "../features/team/MemberCard";

type TeamView = "all" | "projects" | "unassigned";

const PROJECT_COLORS = [
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
];

function expiryDate(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
}

function Team() {
  const {
    members,
    projects,
    loading,
    error,
    updateMember,
    deleteMember,
    assignMemberToProject,
    removeMemberFromProject,
    invitations,
    inviteMember,
    revokeInvitation,
    currentWorkspace,
  } = useWorkspace();

  const [activeView, setActiveView] = useState<TeamView>("all");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"All" | MemberRole>("All");
  const [selectedProject, setSelectedProject] = useState("all");
  const [layout, setLayout] = useState<"grid" | "list">("grid");

  const [modalOpen, setModalOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [assignSelection, setAssignSelection] = useState<
    Record<string, string>
  >({});
  const [serverError, setServerError] = useState("");
  const [pageError, setPageError] = useState("");

  const teamProjects = useMemo<TeamProject[]>(
    () =>
      projects.map((project, index) => ({
        id: project.id,
        name: project.name,
        color: PROJECT_COLORS[index % PROJECT_COLORS.length],
      })),
    [projects]
  );

  const teamMembers = useMemo<TeamMember[]>(
    () =>
      members.map((member) => ({
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        joinedAt: member.joinedAt,
        projectIds: projects
          .filter((project) => project.memberIds.includes(member.id))
          .map((project) => project.id),
      })),
    [members, projects]
  );

  const filteredMembers = useMemo(() => {
    return teamMembers.filter((member) => {
      const matchesSearch =
        member.name.toLowerCase().includes(search.toLowerCase()) ||
        member.email.toLowerCase().includes(search.toLowerCase());

      const matchesRole =
        roleFilter === "All" || member.role === roleFilter;

      const matchesProject =
        selectedProject === "all" ||
        member.projectIds.includes(selectedProject);

      const matchesView =
        activeView !== "unassigned" || member.projectIds.length === 0;

      return (
        matchesSearch &&
        matchesRole &&
        matchesProject &&
        matchesView
      );
    });
  }, [teamMembers, search, roleFilter, selectedProject, activeView]);

  const totalAssigned = teamMembers.filter(
    (member) => member.projectIds.length > 0
  ).length;

  const totalUnassigned = teamMembers.length - totalAssigned;

  const openEditModal = (member: TeamMember) => {
    setEditingMember(member);
    setServerError("");
    setModalOpen(true);
  };

  const handleSaveMember = async (
    data: Omit<TeamMember, "id" | "joinedAt">
  ) => {
    setServerError("");

    if (!editingMember) return;

    try {
      await updateMember(editingMember.id, { role: data.role });

      // A project owner can never be detached from their own project.
      const ownedProjectIds = projects
        .filter((project) => project.ownerId === editingMember.id)
        .map((project) => project.id);

      for (const projectId of data.projectIds) {
        if (!editingMember.projectIds.includes(projectId)) {
          await assignMemberToProject(projectId, editingMember.id);
        }
      }

      for (const projectId of editingMember.projectIds) {
        if (
          !data.projectIds.includes(projectId) &&
          !ownedProjectIds.includes(projectId)
        ) {
          await removeMemberFromProject(projectId, editingMember.id);
        }
      }

      setModalOpen(false);
      setEditingMember(null);
    } catch (caught) {
      setServerError(
        caught instanceof Error
          ? caught.message
          : "The member could not be saved."
      );
    }
  };

  const handleInvite = async (email: string, role: MemberRole) => {
    setPageError("");

    try {
      return await inviteMember(email, role);
    } catch (caught) {
      throw new Error(
        caught instanceof Error
          ? caught.message
          : "The invitation could not be sent."
      );
    }
  };

  const handleRevoke = async (invitationId: string) => {
    setPageError("");

    try {
      await revokeInvitation(invitationId);
    } catch (caught) {
      setPageError(
        caught instanceof Error
          ? caught.message
          : "The invitation could not be revoked."
      );
    }
  };

  const handleAssign = async (projectId: string) => {
    const memberId = assignSelection[projectId];

    if (!memberId) return;

    setPageError("");

    try {
      await assignMemberToProject(projectId, memberId);

      setAssignSelection((current) => ({ ...current, [projectId]: "" }));
    } catch (caught) {
      setPageError(
        caught instanceof Error
          ? caught.message
          : "The member could not be assigned."
      );
    }
  };

  const handleDeleteMember = async (member: TeamMember) => {
    const confirmed = window.confirm(
      `Remove ${member.name} from the workspace?`
    );

    if (!confirmed) return;

    setPageError("");

    try {
      await deleteMember(member.id);
    } catch (caught) {
      setPageError(
        caught instanceof Error
          ? caught.message
          : "The member could not be removed."
      );
    }
  };

  const projectMembers = (projectId: string) =>
    filteredMembers.filter((member) =>
      member.projectIds.includes(projectId)
    );

  const tabs: { id: TeamView; label: string; count: number }[] = [
    { id: "all", label: "All members", count: teamMembers.length },
    {
      id: "projects",
      label: "By project",
      count: teamProjects.length,
    },
    {
      id: "unassigned",
      label: "Unassigned",
      count: totalUnassigned,
    },
  ];

  const renderMemberCards = (list: TeamMember[]) => {
    if (list.length === 0) {
      return (
        <div className="animate-pop-in col-span-full rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
            <Users className="text-slate-300" size={28} />
          </div>
          <p className="mt-4 font-semibold text-slate-700">
            No members found
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Try changing your search or filters.
          </p>
        </div>
      );
    }

    return list.map((member, index) => (
      <div
        key={member.id}
        className="animate-slide-up"
        style={{ animationDelay: `${index * 60}ms` }}
      >
        <MemberCard
          member={member}
          projects={teamProjects}
          onEdit={openEditModal}
          onDelete={handleDeleteMember}
        />
      </div>
    ));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center animate-fade-in">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-indigo-600">Team</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Team Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your organization, project teams and member assignments.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md active:translate-y-0"
        >
          <UserPlus size={17} />
          Invite member
        </button>
      </div>

      {(error || pageError) && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError || error}
        </p>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total members",
            value: teamMembers.length,
            hint: "In your organization",
            icon: Users,
            iconClass: "bg-indigo-50 text-indigo-600",
          },
          {
            label: "Active projects",
            value: teamProjects.length,
            hint: "Projects with team assignments",
            icon: FolderKanban,
            iconClass: "bg-sky-50 text-sky-600",
          },
          {
            label: "Assigned members",
            value: totalAssigned,
            hint: "Working on at least one project",
            icon: UserCheck,
            iconClass: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Unassigned members",
            value: totalUnassigned,
            hint: "Available for project assignment",
            icon: BriefcaseBusiness,
            iconClass: "bg-amber-50 text-amber-600",
          },
        ].map((item, index) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="animate-slide-up rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  {item.label}
                </span>
                <div
                  className={`rounded-xl p-2.5 transition-transform duration-200 ${item.iconClass}`}
                >
                  <Icon size={19} />
                </div>
              </div>
              <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900">
                {loading ? "—" : item.value}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {item.hint}
              </p>
            </div>
          );
        })}
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="animate-slide-up rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <Mail size={17} className="text-indigo-600" />
              Pending invitations
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-500">
                {invitations.length}
              </span>
            </h2>

            <p className="text-xs text-slate-400">
              These people have not joined the workspace yet.
            </p>
          </div>

          <ul className="mt-4 divide-y divide-slate-100">
            {invitations.map((invitation) => (
              <li
                key={invitation.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {invitation.email}
                  </p>

                  <p className="text-xs text-slate-400">
                    {formatRole(invitation.role)}
                    {expiryDate(invitation.expiresAt)
                      ? ` · expires ${expiryDate(invitation.expiresAt)}`
                      : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRevoke(invitation.id)}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <X size={13} />
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Main content */}
      <div className="animate-slide-up overflow-hidden rounded-2xl border border-slate-200 bg-white" style={{ animationDelay: "260ms" }}>
        {/* Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 pt-4">
          <div className="flex flex-wrap gap-5">
            {tabs.map((tab, index) => (
              <button
                type="button"
                key={tab.id}
                onClick={() => {
                  setActiveView(tab.id);
                  setSelectedProject("all");
                }}
                className={`animate-pop-in border-b-2 pb-4 text-sm font-semibold transition-all duration-200 ${
                  activeView === tab.id
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
                style={{ animationDelay: `${index * 70}ms` }}
              >
                {tab.label}
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                    activeView === tab.id
                      ? "bg-indigo-50 text-indigo-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeView === "all" && (
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-indigo-500"
              >
                <option value="all">All projects</option>
                {teamProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={roleFilter}
              onChange={(e) =>
                setRoleFilter(e.target.value as "All" | MemberRole)
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-indigo-500"
            >
              <option value="All">All roles</option>
              <option value="OWNER">{formatRole("OWNER")}</option>
              <option value="ADMIN">{formatRole("ADMIN")}</option>
              <option value="MANAGER">{formatRole("MANAGER")}</option>
              <option value="MEMBER">{formatRole("MEMBER")}</option>
            </select>

            {activeView !== "projects" && (
              <div className="flex rounded-xl border border-slate-200 p-1">
                <button
                  type="button"
                  onClick={() => setLayout("grid")}
                  aria-label="Grid view"
                  className={`rounded-lg p-2 ${
                    layout === "grid"
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <LayoutGrid size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => setLayout("list")}
                  aria-label="List view"
                  className={`rounded-lg p-2 ${
                    layout === "list"
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <List size={17} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* All members */}
        {activeView === "all" && (
          <div className="p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Organization directory
                  <span className="ml-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium tabular-nums text-slate-500">
                    {filteredMembers.length}
                  </span>
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {filteredMembers.length} members found
                </p>
              </div>
            </div>

            <div
              className={
                layout === "grid"
                  ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                  : "grid gap-3"
              }
            >
              {renderMemberCards(filteredMembers)}
            </div>
          </div>
        )}

        {/* Project-wise members */}
        {activeView === "projects" && (
          <div className="space-y-7 p-5">
            {teamProjects.map((project, projectIndex) => {
              const assigned = projectMembers(project.id);

              return (
                <section
                  key={project.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${projectIndex * 80}ms` }}
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {project.name}
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {assigned.length} assigned{" "}
                          {assigned.length === 1 ? "member" : "members"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={assignSelection[project.id] ?? ""}
                        onChange={(event) =>
                          setAssignSelection((current) => ({
                            ...current,
                            [project.id]: event.target.value,
                          }))
                        }
                        aria-label={`Assign a member to ${project.name}`}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none focus:border-indigo-500"
                      >
                        <option value="">Assign member...</option>

                        {teamMembers
                          .filter(
                            (member) =>
                              !member.projectIds.includes(project.id)
                          )
                          .map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name}
                            </option>
                          ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleAssign(project.id)}
                        disabled={!assignSelection[project.id]}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-all duration-200 hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <UserPlus size={14} />
                        Assign
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {assigned.length > 0 ? (
                      assigned.map((member, memberIndex) => (
                        <div
                          key={member.id}
                          className="animate-slide-up"
                          style={{
                            animationDelay: `${projectIndex * 80 + memberIndex * 60}ms`,
                          }}
                        >
                          <MemberCard
                            member={member}
                            projects={teamProjects}
                            onEdit={openEditModal}
                            onDelete={handleDeleteMember}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="animate-pop-in col-span-full rounded-xl border border-dashed border-slate-200 py-10 text-center">
                        <p className="text-sm font-medium text-slate-500">
                          No members assigned to this project yet.
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Use "Add member" above to start building this team.
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              );
            })}

            {teamProjects.length === 0 && (
              <p className="py-10 text-center text-sm text-slate-400">
                No projects in this workspace yet.
              </p>
            )}
          </div>
        )}

        {/* Unassigned members */}
        {activeView === "unassigned" && (
          <div className="p-5">
            <div className="mb-5">
              <h2 className="font-semibold text-slate-900">
                Unassigned members
                <span className="ml-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium tabular-nums text-slate-500">
                  {filteredMembers.length}
                </span>
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Members who are not currently part of any project.
              </p>
            </div>

            <div
              className={
                layout === "grid"
                  ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                  : "grid gap-3"
              }
            >
              {renderMemberCards(filteredMembers)}
            </div>
          </div>
        )}
      </div>

      {modalOpen && editingMember && (
        <MemberModal
          member={editingMember}
          projects={teamProjects}
          serverError={serverError}
          onClose={() => {
            setModalOpen(false);
            setEditingMember(null);
            setServerError("");
          }}
          onSave={handleSaveMember}
        />
      )}

      {inviteOpen && (
        <InviteModal
          allowAdmin={currentWorkspace?.role === "OWNER"}
          onClose={() => setInviteOpen(false)}
          onInvite={handleInvite}
        />
      )}
    </div>
  );
}

export default Team;
