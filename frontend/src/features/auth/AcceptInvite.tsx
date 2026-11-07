import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  LogIn,
  Mail,
  UserPlus,
  XCircle,
} from "lucide-react";

import { useWorkspace } from "../../hooks/useWorkspace";

interface AcceptInviteProps {
  token: string;
  onAccepted: () => void;
}

export function AcceptInvite({ token, onAccepted }: AcceptInviteProps) {
  const { acceptInvitation, switchWorkspace } = useWorkspace();
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    // The effect runs again when the workspace list changes, the invitation
    // is only accepted once.
    if (started.current) return;

    started.current = true;

    acceptInvitation(token)
      .then((result) => {
        setWorkspaceName(result.workspaceName || "the workspace");

        if (result.workspaceId) {
          switchWorkspace(result.workspaceId);
        }
      })
      .catch((caught) => {
        setError(
          caught instanceof Error
            ? caught.message
            : "The invitation could not be accepted."
        );
      });
  }, [acceptInvitation, switchWorkspace, token]);

  if (workspaceName) {
    return (
      <div className="animate-pop-in space-y-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={26} />
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-800">
            You joined {workspaceName}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            The workspace is now in your workspace list.
          </p>
        </div>

        <button
          type="button"
          onClick={onAccepted}
          className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          Open the workspace
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-pop-in space-y-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <XCircle size={26} />
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-800">
            The invitation was not accepted
          </p>

          <p className="mt-1 text-sm text-slate-500">{error}</p>
        </div>

        <button
          type="button"
          onClick={onAccepted}
          className="w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Continue to the app
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3 py-6 text-sm text-slate-500">
      <Loader2 size={18} className="animate-spin text-indigo-600" />
      Joining the workspace...
    </div>
  );
}

interface InviteLandingProps {
  onRegister: () => void;
  onLogin: () => void;
}

export function InviteLanding({
  onRegister,
  onLogin,
}: InviteLandingProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
        <Mail size={18} className="mt-0.5 shrink-0" />

        <p>
          Sign in with the invited email address, or create an account with
          it, to join the workspace.
        </p>
      </div>

      <button
        type="button"
        onClick={onRegister}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
      >
        <UserPlus size={17} />
        Create an account
      </button>

      <button
        type="button"
        onClick={onLogin}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
      >
        <LogIn size={17} />
        I already have an account
      </button>
    </div>
  );
}

export default AcceptInvite;
