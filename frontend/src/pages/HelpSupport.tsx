
import { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  LifeBuoy,
  Mail,
  MessageSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const faqs = [
  {
    question: "How does the AI assistant read my workspace?",
    answer:
      "The assistant pulls projects, tasks, members and deadlines for the workspace you are in, then scores overdue work, unassigned tasks and team load before it answers. It never invents numbers that are not in your data.",
  },
  {
    question: "Why is a project marked at risk?",
    answer:
      "A project turns at risk when it has overdue tasks or sits more than 25% behind its expected schedule, and critical once the deadline has passed. The reasons are listed on every health card.",
  },
  {
    question: "Who can change workspace settings?",
    answer:
      "Owners and admins manage members and roles. Managers can create and assign work. Every member can update their own profile and password.",
  },
  {
    question: "How are priorities scored?",
    answer:
      "Each open task gets a score from how late it is, its priority, whether it still has no assignee and how close the deadline is. The highest scoring tasks are what the assistant recommends first.",
  },
  {
    question: "Can I keep working while signed out?",
    answer:
      "No. Projects, tasks and team data need an active session, so NexusFlow returns you to the sign in screen after a token expires.",
  },
];

const shortcuts = [
  { keys: "?", label: "Open the assistant" },
  { keys: "N", label: "New task" },
  { keys: "G then P", label: "Go to projects" },
  { keys: "Esc", label: "Close a dialog" },
];

function HelpSupport() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div className="animate-fade-in">
        <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
          <span>Workspace</span>
          <span>/</span>
          <span className="text-indigo-600">Help</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Help & Support
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Answers to common questions and a direct line to the team.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: BookOpen,
            title: "Documentation",
            text: "Guides for projects, tasks, roles and the AI assistant.",
            action: "Read the docs",
          },
          {
            icon: MessageSquare,
            title: "Chat with support",
            text: "Ask anything about your workspace or your account.",
            action: "Send a message",
          },
          {
            icon: LifeBuoy,
            title: "Report an issue",
            text: "Tell us what broke and we will pick it up.",
            action: "Report a bug",
          },
        ].map((card, index) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="animate-slide-up rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Icon size={19} />
              </div>

              <h2 className="mt-4 text-sm font-semibold text-slate-900">
                {card.title}
              </h2>

              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                {card.text}
              </p>

              <a
                href="mailto:support@nexusflow.app"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
              >
                {card.action}
                <Mail size={14} />
              </a>
            </div>
          );
        })}
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="animate-slide-up overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2" style={{ animationDelay: "120ms" }}>
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-800">
              Frequently asked questions
            </h2>
          </div>

          <ul className="divide-y divide-slate-100">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;

              return (
                <li key={faq.question}>
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
                  >
                    <span className="text-sm font-medium text-slate-800">
                      {faq.question}
                    </span>

                    <ChevronDown
                      size={17}
                      className={`shrink-0 text-slate-400 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <p className="animate-fade-in px-5 pb-5 text-sm leading-relaxed text-slate-600">
                      {faq.answer}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <div className="space-y-5">
          <section className="animate-slide-up rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" style={{ animationDelay: "180ms" }}>
            <h2 className="text-sm font-semibold text-slate-800">
              Keyboard shortcuts
            </h2>

            <ul className="mt-4 space-y-2.5">
              {shortcuts.map((shortcut) => (
                <li
                  key={shortcut.keys}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-500">{shortcut.label}</span>

                  <kbd className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs font-semibold text-slate-600">
                    {shortcut.keys}
                  </kbd>
                </li>
              ))}
            </ul>
          </section>

          <section className="animate-slide-up rounded-2xl bg-linear-to-br from-slate-900 via-blue-900 to-slate-900 p-5 text-white shadow-sm" style={{ animationDelay: "240ms" }}>
            <div className="flex items-center gap-2 text-blue-200">
              <Sparkles size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">
                NexusFlow AI
              </span>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Ask the assistant inside your workspace for answers grounded in
              your own projects and tasks.
            </p>

            <p className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck size={14} />
              Your data stays inside your workspace.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default HelpSupport;
