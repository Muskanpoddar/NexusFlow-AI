import { useState, type FormEvent } from "react";
import { Check, Copy, Mail, X } from "lucide-react";

import { formatRole } from "../auth/authService";
import type { MemberRole } from "../../types/team";

export type { MemberRole };

interface InviteModalProps {
  allowAdmin: boolean;
  onClose: () => void;
  onInvite: (
    email: string,
    role: MemberRole
  ) => Promise<{ inviteLink: string; emailed: boolean }>;
}

function InviteModal({
  allowAdmin,
  onClose,
  onInvite,
}: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("MEMBER");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{
    inviteLink: string;
    emailed: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const address = email.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError("Enter a valid email address.");
      return;
    }

    setError("");
    setSending(true);

    try {
      setSent(await onInvite(address, role));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The invitation could not be sent."
      );
    } finally {
      setSending(false);
    }
  }

  async function copyLink() {
    if (!sent) return;

    try {
      await navigator.clipboard.writeText(sent.inviteLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Invite a team member
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              They get a link to join this workspace.
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

        {sent ? (
          <div className="space-y-5 p-6">
            <div className="flex items-start gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <Check size={18} className="mt-0.5 shrink-0" />

              <p>
                {sent.emailed
                  ? `The invitation was emailed to ${email.trim()}.`
                  : `No mail service is configured, so share this link with ${email.trim()} yourself.`}
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Invitation link
              </label>

              <div className="flex gap-2">
                <input
                  readOnly
                  value={sent.inviteLink}
                  aria-label="Invitation link"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600 outline-none"
                />

                <button
                  type="button"
                  onClick={copyLink}
                  className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              <p className="mt-1.5 text-xs text-slate-400">
                The link works once and expires after a few days.
              </p>
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 p-6">
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Email address
              </label>

              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  autoFocus
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-9 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <p className="mt-1.5 text-xs text-slate-400">
                They can join with this address, even if they do not have a
                NexusFlow account yet.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Role
              </label>

              <select
                value={role}
                onChange={(event) =>
                  setRole(event.target.value as MemberRole)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500"
              >
                {allowAdmin && (
                  <option value="ADMIN">{formatRole("ADMIN")}</option>
                )}

                <option value="MANAGER">{formatRole("MANAGER")}</option>
                <option value="MEMBER">{formatRole("MEMBER")}</option>
              </select>
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
                disabled={sending}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {sending ? "Sending..." : "Send invitation"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default InviteModal;
