  import type { Project } from "../../types/project";
  import type { Task } from "../../types/task";
  import type { TeamMember } from "../../types/team";
  import type { WorkspaceData } from "../../store/workspace.store";

  export type HealthLevel = "on-track" | "at-risk" | "critical" | "completed";
  export type TaskFlag = "overdue" | "high" | "unassigned" | "due-soon";
  export type WorkloadLevel =
    | "overloaded"
    | "balanced"
    | "underloaded"
    | "available";

  export type AIIntent =
    | "overview"
    | "project-health"
    | "overdue-tasks"
    | "workload"
    | "priorities"
    | "unassigned"
    | "weekly-report"
    | "project-summary"
    | "risk-report";

  export interface ProjectInsight {
    id: string;
    name: string;
    status: Project["status"];
    health: HealthLevel;
    completion: number;
    totalTasks: number;
    openTasks: number;
    overdueTasks: number;
    unassignedTasks: number;
    daysToDue: number | null;
    reasons: string[];
  }

  export interface TaskInsight {
    id: string;
    title: string;
    projectId: string;
    projectName: string;
    assigneeId: string | null;
    assigneeName: string | null;
    status: Task["status"];
    priority: Task["priority"];
    dueDate: string;
    daysOverdue: number;
    score: number;
    flags: TaskFlag[];
    reasons: string[];
  }

  export interface WorkloadInsight {
    id: string;
    name: string;
    role: TeamMember["role"];
    open: number;
    highPriority: number;
    overdue: number;
    load: number;
    level: WorkloadLevel;
  }

  export interface ReportSection {
    heading: string;
    bullets: string[];
  }

  export interface AIAnswer {
    intent: AIIntent;
    headline: string;
    narrative: string;
    sections: ReportSection[];
    projects: ProjectInsight[];
    tasks: TaskInsight[];
    workload: WorkloadInsight[];
    followUps: string[];
    source: "engine" | "llm";
  }

  const DAY = 86_400_000;
  const FULL_LOAD_TASKS = 5;

  function startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  export function parseDay(value: string): Date | null {
    if (!value) return null;

    const parsed = new Date(`${value}T00:00:00`);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function dayDiff(from: Date, to: Date): number {
    return Math.round(
      (startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY
    );
  }

  export function isOverdue(task: Task, today: Date): boolean {
    if (task.status === "Done") return false;

    const due = parseDay(task.dueDate);

    return due !== null && dayDiff(due, today) > 0;
  }

  export function analyzeProject(
    project: Project,
    tasks: Task[],
    today: Date
  ): ProjectInsight {
    const projectTasks = tasks.filter((task) => task.projectId === project.id);
    const completed = projectTasks.filter(
      (task) => task.status === "Done"
    ).length;
    const completion =
      projectTasks.length === 0
        ? 0
        : Math.round((completed / projectTasks.length) * 100);

    const openTasks = projectTasks.length - completed;
    const overdueTasks = projectTasks.filter((task) =>
      isOverdue(task, today)
    ).length;
    const unassignedTasks = projectTasks.filter(
      (task) => !task.assigneeId && task.status !== "Done"
    ).length;

    const start = parseDay(project.startDate);
    const due = parseDay(project.dueDate);
    const daysToDue = due ? dayDiff(today, due) : null;

    const scheduleLength = start && due ? dayDiff(start, due) : 0;
    const elapsed = start ? Math.max(0, dayDiff(start, today)) : 0;
    const expected =
      scheduleLength > 0
        ? Math.round(Math.min(1, elapsed / scheduleLength) * 100)
        : 0;
    const behind = expected - completion;

    const reasons: string[] = [];

    if (daysToDue !== null && daysToDue < 0) {
      reasons.push(`Deadline passed ${Math.abs(daysToDue)} days ago`);
    }

    if (overdueTasks > 0) {
      reasons.push(
        `${overdueTasks} overdue ${overdueTasks === 1 ? "task" : "tasks"}`
      );
    }

    if (behind > 25) {
      reasons.push(`Progress is ${behind}% behind schedule`);
    }

    if (openTasks > 0) {
      reasons.push(`${openTasks} ${openTasks === 1 ? "task" : "tasks"} still open`);
    }

    let health: HealthLevel;

    if (project.status === "Completed") {
      health = "completed";
    } else if (projectTasks.length === 0) {
      health = "on-track";
      reasons.length = 0;
      reasons.push("No tasks planned yet");
    } else if (daysToDue !== null && daysToDue < 0) {
      health = "critical";
    } else if (overdueTasks > 0 || behind > 25) {
      health = "at-risk";
    } else {
      health = "on-track";
    }

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      health,
      completion,
      totalTasks: projectTasks.length,
      openTasks,
      overdueTasks,
      unassignedTasks,
      daysToDue,
      reasons,
    };
  }

  export function analyzeProjects(
    projects: Project[],
    tasks: Task[],
    today: Date
  ): ProjectInsight[] {
    return projects.map((project) => analyzeProject(project, tasks, today));
  }

  export function analyzeTask(
    task: Task,
    projects: Project[],
    members: TeamMember[],
    today: Date
  ): TaskInsight {
    const project = projects.find((item) => item.id === task.projectId);
    const member = members.find((item) => item.id === task.assigneeId);
    const due = parseDay(task.dueDate);
    const overdue = isOverdue(task, today);
    const daysOverdue = overdue && due ? dayDiff(due, today) : 0;

    const flags: TaskFlag[] = [];
    const reasons: string[] = [];
    let score = 0;

    if (overdue) {
      score += 60 + Math.min(daysOverdue, 30);
      flags.push("overdue");
      reasons.push(
        `Overdue by ${daysOverdue} ${daysOverdue === 1 ? "day" : "days"}`
      );
    }

    if (task.priority === "High") {
      score += 30;
      flags.push("high");
      reasons.push("High priority");
    } else if (task.priority === "Medium") {
      score += 15;
    }

    if (!task.assigneeId) {
      score += 20;
      flags.push("unassigned");
      reasons.push("No assignee");
    }

    if (task.status === "In Progress") {
      score += 10;
      reasons.push("Already in progress");
    }

    if (due && !overdue && dayDiff(today, due) <= 3) {
      score += 15;
      flags.push("due-soon");
      reasons.push("Due within 3 days");
    }

    return {
      id: task.id,
      title: task.title,
      projectId: task.projectId,
      projectName: project?.name ?? "Unknown project",
      assigneeId: task.assigneeId,
      assigneeName: member?.name ?? null,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      daysOverdue,
      score: Math.min(99, score),
      flags,
      reasons,
    };
  }

  export function analyzeTasks(
    tasks: Task[],
    projects: Project[],
    members: TeamMember[],
    today: Date
  ): TaskInsight[] {
    return tasks
      .map((task) => analyzeTask(task, projects, members, today))
      .sort((a, b) => b.score - a.score);
  }

  export function analyzeWorkload(
    members: TeamMember[],
    tasks: Task[],
    today: Date
  ): WorkloadInsight[] {
    return members
      .map((member) => {
        const open = tasks.filter(
          (task) => task.assigneeId === member.id && task.status !== "Done"
        );

        const overdue = open.filter((task) => isOverdue(task, today)).length;
        const highPriority = open.filter(
          (task) => task.priority === "High"
        ).length;

        let level: WorkloadLevel;

        if (open.length > FULL_LOAD_TASKS) {
          level = "overloaded";
        } else if (open.length === 0) {
          level = "available";
        } else if (open.length < 2) {
          level = "underloaded";
        } else {
          level = "balanced";
        }

        return {
          id: member.id,
          name: member.name,
          role: member.role,
          open: open.length,
          highPriority,
          overdue,
          load: Math.min(100, Math.round((open.length / FULL_LOAD_TASKS) * 100)),
          level,
        };
      })
      .sort((a, b) => b.open - a.open);
  }

  export function buildWeeklyReport(
    projects: Project[],
    tasks: Task[],
    members: TeamMember[],
    today: Date
  ): ReportSection[] {
    const weekAgo = new Date(startOfDay(today).getTime() - 7 * DAY);
    const dueThisWeek = tasks.filter((task) => {
      const due = parseDay(task.dueDate);

      return due !== null && due >= weekAgo && due <= today;
    });
    const delivered = dueThisWeek.filter((task) => task.status === "Done");
    const missed = dueThisWeek.filter((task) => task.status !== "Done");
    const completedTotal = tasks.filter((task) => task.status === "Done").length;
    const completionRate =
      tasks.length === 0
        ? 0
        : Math.round((completedTotal / tasks.length) * 100);

    const insights = analyzeProjects(projects, tasks, today);
    const atRisk = insights.filter(
      (project) => project.health === "at-risk" || project.health === "critical"
    );
    const workload = analyzeWorkload(members, tasks, today);
    const busiest = workload[0];

    return [
      {
        heading: "Highlights",
        bullets: [
          `${delivered.length} ${delivered.length === 1 ? "task" : "tasks"} were due in the last 7 days and are complete`,
          `${missed.length} ${missed.length === 1 ? "task" : "tasks"} came due in the last 7 days and ${missed.length === 1 ? "is" : "are"} still open`,
          `Workspace completion stands at ${completionRate}% (${completedTotal} of ${tasks.length} tasks done)`,
          `${projects.filter((project) => project.status === "Active").length} projects are active right now`,
        ],
      },
      {
        heading: "Attention needed",
        bullets: [
          atRisk.length === 0
            ? "No projects are flagged as falling behind"
            : `${atRisk.length} ${atRisk.length === 1 ? "project needs" : "projects need"} attention: ${atRisk.map((project) => project.name).join(", ")}`,
          `${workload.reduce((total, member) => total + member.overdue, 0)} overdue tasks across the team`,
          `${workload.filter((member) => member.level === "available").length} team members have no open tasks`,
        ],
      },
      {
        heading: "Team capacity",
        bullets: busiest
          ? [
              `${busiest.name} carries the heaviest load with ${busiest.open} open tasks`,
              `${workload.filter((member) => member.level === "overloaded").length} members are over capacity (${FULL_LOAD_TASKS}+ open tasks)`,
              `${workload.filter((member) => member.level === "underloaded" || member.level === "available").length} members can take on more work`,
            ]
          : ["No team members in this workspace yet"],
      },
    ];
  }

  export function buildRiskReport(
    projects: Project[],
    tasks: Task[],
    members: TeamMember[],
    today: Date
  ): ReportSection[] {
    const insights = analyzeProjects(projects, tasks, today);
    const critical = insights.filter((project) => project.health === "critical");
    const atRisk = insights.filter((project) => project.health === "at-risk");
    const overdue = analyzeTasks(tasks, projects, members, today).filter((task) =>
      task.flags.includes("overdue")
    );
    const unassigned = tasks.filter(
      (task) => !task.assigneeId && task.status !== "Done"
    );

    const averageDelay =
      overdue.length === 0
        ? 0
        : Math.round(
            overdue.reduce((total, task) => total + task.daysOverdue, 0) /
              overdue.length
          );

    return [
      {
        heading: "Critical projects",
        bullets:
          critical.length === 0
            ? ["No project has passed its deadline"]
            : critical.map((project) => {
                const due =
                  project.daysToDue !== null
                    ? ` (deadline ${Math.abs(project.daysToDue)} days ago)`
                    : "";

                return `${project.name}${due} — ${project.completion}% complete with ${project.overdueTasks} overdue tasks`;
              }),
      },
      {
        heading: "Projects at risk",
        bullets:
          atRisk.length === 0
            ? ["No project is trending behind schedule"]
            : atRisk.map(
                (project) =>
                  `${project.name} — ${project.completion}% complete, ${project.reasons[0] ?? "needs review"}`
              ),
      },
      {
        heading: "Delay analysis",
        bullets: [
          `${overdue.length} overdue ${overdue.length === 1 ? "task" : "tasks"} averaging ${averageDelay} days late`,
          `${unassigned.length} open ${unassigned.length === 1 ? "task has" : "tasks have"} no assignee`,
          `${tasks.filter((task) => task.status === "In Progress").length} tasks are in progress`,
        ],
      },
      {
        heading: "Recommended mitigation",
        bullets: [
          overdue.length > 0
            ? `Clear the ${overdue.length} overdue ${overdue.length === 1 ? "task" : "tasks"} first — they carry the highest schedule risk`
            : "Keep overdue work at zero and stay ahead of the current schedule",
          unassigned.length > 0
            ? `Assign the ${unassigned.length} unassigned ${unassigned.length === 1 ? "task" : "tasks"} to balance the team`
            : "Every open task has an owner",
          atRisk.length > 0
            ? `Re-plan ${atRisk.length === 1 ? "the" : "each"} at-risk ${atRisk.length === 1 ? "project" : "projects"} and move the highest-scoring tasks to the front`
            : "Current timelines look sustainable",
        ],
      },
    ];
  }

  export function buildProjectSummary(
    project: Project,
    projects: Project[],
    tasks: Task[],
    members: TeamMember[],
    today: Date
  ): ReportSection[] {
    const insight = analyzeProject(project, tasks, today);
    const projectTasks = tasks.filter((task) => task.projectId === project.id);
    const ranked = analyzeTasks(projectTasks, projects, members, today);

    return [
      {
        heading: "Snapshot",
        bullets: [
          `Status is ${project.status} with ${insight.completion}% of tasks complete`,
          `${insight.openTasks} open ${insight.openTasks === 1 ? "task" : "tasks"} of ${insight.totalTasks} total`,
          insight.daysToDue === null
            ? "No deadline set"
            : insight.daysToDue < 0
              ? `Deadline passed ${Math.abs(insight.daysToDue)} days ago`
              : `Deadline in ${insight.daysToDue} days`,
          `Health is rated ${insight.health.replace("-", " ")}`,
        ],
      },
      {
        heading: "Progress",
        bullets: [
          `${projectTasks.filter((task) => task.status === "Done").length} tasks completed`,
          `${projectTasks.filter((task) => task.status === "In Progress").length} tasks in progress`,
          `${projectTasks.filter((task) => task.status === "To Do").length} tasks not started`,
        ],
      },
      {
        heading: "Blockers",
        bullets:
          insight.reasons.length === 0
            ? ["Nothing is currently blocking this project"]
            : insight.reasons,
      },
      {
        heading: "Next steps",
        bullets:
          ranked.length === 0
            ? ["Add tasks to build a plan for this project"]
            : ranked
                .filter((task) => task.status !== "Done")
                .slice(0, 3)
                .map(
                  (task) =>
                    `${task.title} — ${task.reasons[0] ?? "recommended next"}`
                ),
      },
    ];
  }

  const INTENT_KEYWORDS: { intent: AIIntent; keywords: string[] }[] = [
    {
      intent: "weekly-report",
      keywords: [
        "weekly progress",
        "weekly report",
        "progress report",
        "weekly",
        "week",
      ],
    },
    {
      intent: "risk-report",
      keywords: ["risk analysis", "delay analysis", "mitigation", "risk", "blocker"],
    },
    {
      intent: "overdue-tasks",
      keywords: ["past due", "overdue", "behind schedule", "missed", "late"],
    },
    {
      intent: "project-health",
      keywords: [
        "falling behind",
        "at risk",
        "project health",
        "health",
        "behind",
        "delayed",
      ],
    },
    {
      intent: "workload",
      keywords: ["workload", "capacity", "overwhelmed", "too much", "busy", "balance"],
    },
    {
      intent: "priorities",
      keywords: [
        "what should i do",
        "start with",
        "priorit",
        "focus on",
        "focus",
        "first",
        "next up",
      ],
    },
    {
      intent: "unassigned",
      keywords: [
        "no assignee",
        "not assigned",
        "unassigned",
        "without owner",
        "unowned",
      ],
    },
    {
      intent: "project-summary",
      keywords: ["summary", "summarize", "summarise", "status of", "tell me about"],
    },
  ];

  const HEALTH_ORDER = { critical: 0, "at-risk": 1, "on-track": 2, completed: 3 };

  function scoreIntent(question: string, intent: AIIntent): number {
    const lower = question.toLowerCase();

    const entry = INTENT_KEYWORDS.find((item) => item.intent === intent);

    if (!entry) return 0;

    return entry.keywords.reduce((total, keyword) => {
      if (!lower.includes(keyword)) return total;

      return total + keyword.split(" ").length;
    }, 0);
  }

  export function detectIntent(
    question: string,
    projects: Project[],
    members: TeamMember[]
  ): {
    intent: AIIntent;
    project?: Project;
    member?: TeamMember;
  } {
    const lower = question.toLowerCase();

    const mentionedProject = projects.find((project) =>
      lower.includes(project.name.toLowerCase())
    );

    const mentionedMember = members.find(
      (member) =>
        lower.includes(member.name.toLowerCase()) ||
        lower.includes(member.name.split(" ")[0].toLowerCase())
    );

    const ranked = INTENT_KEYWORDS.map((entry) => ({
      intent: entry.intent,
      score: scoreIntent(question, entry.intent),
    })).sort((a, b) => b.score - a.score);

    const best = ranked[0];

    if (
      mentionedProject &&
      (!best || best.score === 0 || best.intent === "project-summary")
    ) {
      return { intent: "project-summary", project: mentionedProject };
    }

    if (mentionedMember && (!best || best.score === 0)) {
      return { intent: "workload", member: mentionedMember };
    }

    return {
      intent: best && best.score > 0 ? best.intent : "overview",
      project: mentionedProject,
      member: mentionedMember,
    };
  }

  function plural(count: number, singular: string): string {
    return count === 1 ? singular : `${singular}s`;
  }

  function sortByHealth(insights: ProjectInsight[]): ProjectInsight[] {
    return [...insights].sort(
      (a, b) => HEALTH_ORDER[a.health] - HEALTH_ORDER[b.health]
    );
  }

  function buildOverview(data: WorkspaceData, today: Date): AIAnswer {
    const { projects, tasks, members } = data;
    const insights = sortByHealth(analyzeProjects(projects, tasks, today));
    const ranked = analyzeTasks(tasks, projects, members, today);
    const needingAttention = insights.filter(
      (project) => project.health === "critical" || project.health === "at-risk"
    );
    const overdue = ranked.filter((task) => task.flags.includes("overdue"));
    const unassigned = ranked.filter((task) => task.flags.includes("unassigned"));
    const completion =
      tasks.length === 0
        ? 0
        : Math.round(
            (tasks.filter((task) => task.status === "Done").length / tasks.length) *
              100
          );

    return {
      intent: "overview",
      headline: "Workspace pulse",
      narrative: `${projects.length} ${plural(projects.length, "project")}, ${tasks.length} ${plural(tasks.length, "task")} and ${members.length} ${plural(members.length, "member")} — ${completion}% of all work is complete.`,
      sections: [
        {
          heading: "Highlights",
          bullets: [
            `${needingAttention.length} ${plural(needingAttention.length, "project")} ${needingAttention.length === 1 ? "needs" : "need"} attention`,
            `${overdue.length} overdue ${plural(overdue.length, "task")}`,
            `${unassigned.length} open ${plural(unassigned.length, "task")} without an assignee`,
            `${tasks.filter((task) => task.status === "In Progress").length} tasks currently in progress`,
          ],
        },
        {
          heading: "Where to focus",
          bullets: ranked
            .filter((task) => task.status !== "Done")
            .slice(0, 3)
            .map(
              (task) =>
                `${task.title} (${task.projectName}) — ${task.reasons[0] ?? "recommended next"}`
            ),
        },
      ],
      projects: insights,
      tasks: ranked.filter((task) => task.status !== "Done").slice(0, 5),
      workload: analyzeWorkload(members, tasks, today),
      followUps: [
        "Which projects are falling behind?",
        "What tasks are overdue?",
        "Summarize my team's workload.",
        "What should I work on first?",
      ],
      source: "engine",
    };
  }

  function buildProjectHealthAnswer(
    data: WorkspaceData,
    today: Date
  ): AIAnswer {
    const { projects, tasks, members } = data;
    const insights = sortByHealth(analyzeProjects(projects, tasks, today));
    const needingAttention = insights.filter(
      (project) => project.health === "critical" || project.health === "at-risk"
    );

    return {
      intent: "project-health",
      headline:
        needingAttention.length === 0
          ? "Every project is on track"
          : `${needingAttention.length} ${plural(needingAttention.length, "project")} ${needingAttention.length === 1 ? "is" : "are"} falling behind`,
      narrative:
        needingAttention.length === 0
          ? "No project has passed its deadline or slipped more than 25% behind schedule."
          : `${needingAttention
              .slice(0, 2)
              .map(
                (project) =>
                  `${project.name} is ${project.health.replace("-", " ")} — ${project.reasons[0]?.toLowerCase() ?? "needs review"}`
              )
              .join(". ")}.`,
      sections: [
        {
          heading: "Project health",
          bullets: insights.map(
            (project) =>
              `${project.name}: ${project.completion}% complete, ${project.openTasks} open ${plural(project.openTasks, "task")}${
                project.daysToDue !== null
                  ? `, ${project.daysToDue < 0 ? `${Math.abs(project.daysToDue)} days past deadline` : `${project.daysToDue} days to deadline`}`
                  : ""
              }`
          ),
        },
      ],
      projects: insights,
      tasks: analyzeTasks(tasks, projects, members, today)
        .filter((task) => task.status !== "Done")
        .slice(0, 5),
      workload: [],
      followUps: [
        "What tasks are overdue?",
        "Give me a weekly progress report",
        "Which tasks have no assignee?",
      ],
      source: "engine",
    };
  }

  function buildOverdueAnswer(data: WorkspaceData, today: Date): AIAnswer {
    const { projects, tasks, members } = data;
    const overdue = analyzeTasks(tasks, projects, members, today).filter((task) =>
      task.flags.includes("overdue")
    );

    const worst = overdue[0];

    return {
      intent: "overdue-tasks",
      headline:
        overdue.length === 0
          ? "Nothing is overdue"
          : `${overdue.length} ${plural(overdue.length, "task")} ${overdue.length === 1 ? "is" : "are"} overdue`,
      narrative:
        overdue.length === 0
          ? "Every task with a deadline is still within schedule."
          : `The most overdue is "${worst.title}" on ${worst.projectName}, ${worst.daysOverdue} ${plural(worst.daysOverdue, "day")} late.`,
      sections: [
        {
          heading: "Overdue work",
          bullets: overdue.map(
            (task) =>
              `${task.title} — ${task.projectName}, ${task.daysOverdue} ${plural(task.daysOverdue, "day")} late${
                task.assigneeName ? ` (${task.assigneeName})` : ", unassigned"
              }`
          ),
        },
      ],
      projects: sortByHealth(analyzeProjects(projects, tasks, today)),
      tasks: overdue,
      workload: [],
      followUps: [
        "Which projects are falling behind?",
        "What should I work on first?",
        "Give me a weekly progress report",
      ],
      source: "engine",
    };
  }

  function buildWorkloadAnswer(
    data: WorkspaceData,
    today: Date,
    member?: TeamMember
  ): AIAnswer {
    const { projects, tasks, members } = data;
    const all = analyzeWorkload(members, tasks, today);
    const workload = member ? all.filter((item) => item.id === member.id) : all;
    const overloaded = workload.filter((item) => item.level === "overloaded");
    const available = workload.filter(
      (item) => item.level === "available" || item.level === "underloaded"
    );
    const totalOpen = workload.reduce((total, item) => total + item.open, 0);

    return {
      intent: "workload",
      headline: member
        ? `${member.name}'s workload`
        : `${totalOpen} open ${plural(totalOpen, "task")} across ${members.length} ${plural(members.length, "member")}`,
      narrative:
        workload.length === 0
          ? "No team members available to report on."
          : overloaded.length > 0
            ? `${overloaded.map((item) => item.name).join(", ")} ${overloaded.length === 1 ? "is" : "are"} carrying more than ${FULL_LOAD_TASKS} open tasks.`
            : "Load is balanced across the team right now.",
      sections: [
        {
          heading: "Capacity",
          bullets: [
            ...workload.map(
              (item) =>
                `${item.name}: ${item.open} open ${plural(item.open, "task")}, ${item.highPriority} high priority, ${item.overdue} overdue (${item.load}% load)`
            ),
            available.length > 0
              ? `${available.length} ${plural(available.length, "member")} can take on more work`
              : "Everyone currently has a full plate",
          ],
        },
      ],
      projects: [],
      tasks: analyzeTasks(tasks, projects, members, today)
        .filter((task) => task.status !== "Done")
        .slice(0, 5),
      workload,
      followUps: [
        "Which tasks have no assignee?",
        "What should I work on first?",
        "Give me a weekly progress report",
      ],
      source: "engine",
    };
  }

  function buildPrioritiesAnswer(data: WorkspaceData, today: Date): AIAnswer {
    const { projects, tasks, members } = data;
    const ranked = analyzeTasks(tasks, projects, members, today).filter(
      (task) => task.status !== "Done"
    );
    const top = Math.min(5, ranked.length);

    return {
      intent: "priorities",
      headline:
        ranked.length === 0
          ? "Nothing to prioritise right now"
          : `Work on these ${top} ${plural(top, "task")} first`,
      narrative:
        ranked.length === 0
          ? "All tasks in this workspace are complete."
          : "Priority is scored from overdue days, task priority, missing assignees and how close the deadline is.",
      sections: [
        {
          heading: "Reasoning",
          bullets: ranked.slice(0, 5).map(
            (task) =>
              `${task.title} — score ${task.score}: ${task.reasons.join(", ") || "queued work"}`
          ),
        },
      ],
      projects: [],
      tasks: ranked.slice(0, 8),
      workload: [],
      followUps: [
        "What tasks are overdue?",
        "Which tasks have no assignee?",
        "Summarize my team's workload.",
      ],
      source: "engine",
    };
  }

  function buildUnassignedAnswer(data: WorkspaceData, today: Date): AIAnswer {
    const { projects, tasks, members } = data;
    const unassigned = analyzeTasks(tasks, projects, members, today).filter(
      (task) => task.flags.includes("unassigned") && task.status !== "Done"
    );

    return {
      intent: "unassigned",
      headline:
        unassigned.length === 0
          ? "Every open task has an owner"
          : `${unassigned.length} open ${plural(unassigned.length, "task")} ${unassigned.length === 1 ? "has" : "have"} no assignee`,
      narrative:
        unassigned.length === 0
          ? "Nothing is waiting for triage right now."
          : "These tasks are blocking planning until someone picks them up.",
      sections: [
        {
          heading: "Needs triage",
          bullets: unassigned.map(
            (task) => `${task.title} — ${task.projectName} (${task.priority} priority)`
          ),
        },
      ],
      projects: [],
      tasks: unassigned,
      workload: analyzeWorkload(members, tasks, today),
      followUps: [
        "Summarize my team's workload.",
        "What should I work on first?",
        "Which projects are falling behind?",
      ],
      source: "engine",
    };
  }

  export function buildLocalAnswer(
    question: string,
    data: WorkspaceData
  ): AIAnswer {
    const today = new Date();
    const { projects, members } = data;
    const detected = detectIntent(question, projects, members);

    switch (detected.intent) {
      case "project-health":
        return buildProjectHealthAnswer(data, today);

      case "overdue-tasks":
        return buildOverdueAnswer(data, today);

      case "workload":
        return buildWorkloadAnswer(data, today, detected.member);

      case "priorities":
        return buildPrioritiesAnswer(data, today);

      case "unassigned":
        return buildUnassignedAnswer(data, today);

      case "weekly-report":
        return {
          intent: "weekly-report",
          headline: "Weekly progress report",
          narrative: `A summary of the last 7 days across ${data.projects.length} ${plural(data.projects.length, "project")}.`,
          sections: buildWeeklyReport(
            data.projects,
            data.tasks,
            data.members,
            today
          ),
          projects: sortByHealth(
            analyzeProjects(data.projects, data.tasks, today)
          ),
          tasks: [],
          workload: analyzeWorkload(data.members, data.tasks, today),
          followUps: [
            "Which projects are falling behind?",
            "What tasks are overdue?",
            "What should I work on first?",
          ],
          source: "engine",
        };

      case "risk-report":
        return {
          intent: "risk-report",
          headline: "Risk and delay analysis",
          narrative:
            "Where schedules are most likely to slip, and what to do about it.",
          sections: buildRiskReport(
            data.projects,
            data.tasks,
            data.members,
            today
          ),
          projects: sortByHealth(
            analyzeProjects(data.projects, data.tasks, today)
          ),
          tasks: [],
          workload: [],
          followUps: [
            "What tasks are overdue?",
            "Which tasks have no assignee?",
            "Give me a weekly progress report",
          ],
          source: "engine",
        };

      case "project-summary": {
        const project = detected.project ?? data.projects[0];

        if (!project) return buildOverview(data, today);

        return {
          intent: "project-summary",
          headline: `${project.name} summary`,
          narrative: `${project.status} project with ${project.memberIds.length} team ${plural(project.memberIds.length, "member")}.`,
          sections: buildProjectSummary(
            project,
            data.projects,
            data.tasks,
            data.members,
            today
          ),
          projects: analyzeProjects(data.projects, data.tasks, today).filter(
            (item) => item.id === project.id
          ),
          tasks: analyzeTasks(data.tasks, data.projects, data.members, today)
            .filter((task) => task.projectId === project.id)
            .slice(0, 5),
          workload: [],
          followUps: [
            "Which projects are falling behind?",
            "What tasks are overdue?",
            "Summarize my team's workload.",
          ],
          source: "engine",
        };
      }

      default:
        return buildOverview(data, today);
    }
  }
