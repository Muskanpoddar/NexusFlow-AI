import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  CalendarClock,
  FolderKanban,
  Gauge,
  ListChecks,
  Send,
  Sparkles,
  Target,
  UserX,
} from "lucide-react";

import { useWorkspace } from "../../hooks/useWorkspace";
import { useAuth } from "../../hooks/useAuth";
import { analyzeProjects, isOverdue } from "./aiEngine";
import {
  askAssistant,
  loadConversationHistory,
  type ChatMessage,
} from "./aiService";
import {
  ProjectHealthCard,
  ReportSections,
  TaskInsightCard,
  WorkloadCard,
} from "./components/InsightCards";

interface AIAssistantProps {
  onOpenProject: (projectId: string) => void;
}

const STARTER_PROMPTS = [
  {
    icon: FolderKanban,
    label: "Which projects are falling behind?",
    prompt: "Which projects are falling behind?",
  },
  {
    icon: CalendarClock,
    label: "What tasks are overdue?",
    prompt: "What tasks are overdue?",
  },
  {
    icon: Gauge,
    label: "Summarize my team's workload",
    prompt: "Summarize my team's workload.",
  },
  {
    icon: Target,
    label: "What should I work on first?",
    prompt: "What should I work on first?",
  },
  {
    icon: UserX,
    label: "Which tasks have no assignee?",
    prompt: "Which tasks have no assignee?",
  },
  {
    icon: ListChecks,
    label: "Give me a weekly progress report",
    prompt: "Give me a weekly progress report",
  },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function AIAssistant({ onOpenProject }: AIAssistantProps) {
  const { projects, tasks, members, activities, updateTask, workspaceId } =
    useWorkspace();
  const { token } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [today] = useState(() => new Date());

  const insights = useMemo(
    () => analyzeProjects(projects, tasks, today),
    [projects, tasks, today]
  );

  const needingAttention = insights.filter(
    (project) => project.health === "critical" || project.health === "at-risk"
  ).length;

  const overdueCount = tasks.filter((task) => isOverdue(task, today)).length;
  const openTasks = tasks.filter((task) => task.status !== "Done").length;

  useEffect(() => {
    const node = scrollRef.current;

    if (node) {
      node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    }
  }, [messages, thinking]);

  // Restore the persisted conversation whenever the workspace changes.
  useEffect(() => {
    let active = true;

    setMessages([]);
    setConversationId(null);

    if (!token || !workspaceId) return;

    loadConversationHistory(token, workspaceId)
      .then((history) => {
        if (!active) return;

        setConversationId(history.conversationId);
        setMessages(history.messages);
      })
      .catch(() => {
        // A missing history is not an error, the chat simply starts empty.
      });

    return () => {
      active = false;
    };
  }, [token, workspaceId]);

  async function send(question: string) {
    const trimmed = question.trim();

    if (!trimmed || thinking) return;

    setMessages((previous) => [
      ...previous,
      { id: crypto.randomUUID(), role: "user", text: trimmed },
    ]);

    setInput("");
    setThinking(true);

    const reply = await askAssistant(
      trimmed,
      {
        projects,
        tasks,
        members,
        activities,
      },
      token && workspaceId
        ? { token, workspaceId, conversationId }
        : undefined
    );

    await sleep(420);

    setConversationId(reply.conversationId);

    setMessages((previous) => [
      ...previous,
      { id: crypto.randomUUID(), role: "assistant", answer: reply.answer },
    ]);

    setThinking(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    void send(input);
  }

  const stats = [
    { label: "Projects", value: projects.length },
    { label: "Open tasks", value: openTasks },
    { label: "Overdue", value: overdueCount },
    { label: "Need attention", value: needingAttention },
  ];

  return (
    <div className="mx-auto flex h-full min-h-160 w-full max-w-6xl flex-col gap-5">
      <header className="relative animate-slide-up overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-blue-900 to-slate-900 px-6 py-7 text-white shadow-xl sm:px-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-500/25 blur-3xl animate-float" />

        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl animate-float" />

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-blue-100 ring-1 ring-white/15">
            <Sparkles size={13} />
            NexusFlow AI
          </span>

          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Ask anything about your workspace
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            NexusFlow AI reads your live project, task and team data — then
            explains what is slipping, what to do next and who is carrying the
            load.
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="animate-pop-in rounded-xl bg-white/10 px-3.5 py-2 ring-1 ring-white/10 backdrop-blur"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <p className="text-lg font-bold leading-none">
                  {stat.value}
                </p>

                <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="scrollbar-slim min-h-0 flex-1 space-y-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white/60 p-4 backdrop-blur-sm sm:p-5">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-6 text-center">
            <div className="animate-pop-in flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-violet-600 text-white shadow-lg shadow-blue-500/25">
              <Bot size={28} />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-slate-800">
              How can I help?
            </h2>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              Ask about deadlines, project health or team capacity. I will
              answer from your live workspace data.
            </p>

            <div className="mt-6 grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2">
              {STARTER_PROMPTS.map((starter, index) => {
                const Icon = starter.icon;

                return (
                  <button
                    key={starter.prompt}
                    onClick={() => void send(starter.prompt)}
                    className="animate-slide-up flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left text-sm font-medium text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 hover:shadow-md"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Icon size={16} />
                    </span>

                    {starter.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="flex justify-end">
                <div className="animate-pop-in max-w-[85%] rounded-2xl rounded-br-md bg-blue-600 px-4 py-2.5 text-sm leading-relaxed text-white shadow-sm">
                  {message.text}
                </div>
              </div>
            ) : (
              <div key={message.id} className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-violet-600 text-white shadow-md shadow-blue-500/20">
                  <Sparkles size={16} />
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                  {message.answer ? (
                    <>
                      <div className="animate-slide-up">
                        <p className="text-sm font-semibold text-slate-900">
                          {message.answer.headline}
                        </p>

                        {message.answer.narrative && (
                          <p className="mt-1 text-sm leading-relaxed text-slate-600">
                            {message.answer.narrative}
                          </p>
                        )}
                      </div>

                      {message.answer.sections.length > 0 && (
                        <ReportSections sections={message.answer.sections} />
                      )}

                      {message.answer.projects.length > 0 && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {message.answer.projects.map((insight) => (
                            <ProjectHealthCard
                              key={insight.id}
                              insight={insight}
                              onOpenProject={onOpenProject}
                            />
                          ))}
                        </div>
                      )}

                      {message.answer.tasks.length > 0 && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {message.answer.tasks.map((insight) => (
                            <TaskInsightCard
                              key={insight.id}
                              insight={insight}
                              onComplete={(taskId) =>
                                updateTask(taskId, { status: "Done" })
                              }
                              onOpenProject={onOpenProject}
                            />
                          ))}
                        </div>
                      )}

                      {message.answer.workload.length > 0 && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {message.answer.workload.map((insight) => (
                            <WorkloadCard key={insight.id} insight={insight} />
                          ))}
                        </div>
                      )}

                      {message.answer.followUps.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {message.answer.followUps.map((followUp) => (
                            <button
                              key={followUp}
                              onClick={() => void send(followUp)}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                            >
                              {followUp}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="animate-pop-in whitespace-pre-line rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-sm">
                      {message.text}
                    </div>
                  )}
                </div>
              </div>
            )
          )
        )}

        {thinking && (
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-violet-600 text-white shadow-md shadow-blue-500/20">
              <Sparkles size={16} />
            </div>

            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="h-2 w-2 animate-pulse-soft rounded-full bg-blue-400"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}

              <span className="ml-2 text-xs font-medium text-slate-500">
                Analysing workspace data…
              </span>
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100"
      >
        <Sparkles size={18} className="ml-2 shrink-0 text-blue-500" />

        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about projects, deadlines, workload…"
          className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400"
        />

        <button
          type="submit"
          disabled={!input.trim() || thinking}
          aria-label="Send message"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

export default AIAssistant;
