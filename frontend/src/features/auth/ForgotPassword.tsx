
import { useState, type FormEvent } from "react";
import { KeyRound, Loader2, MailCheck } from "lucide-react";

import { requestPasswordReset } from "./authService";

interface ForgotPasswordProps {
  onBackToLogin: () => void;
}

function ForgotPassword({ onBackToLogin }: ForgotPasswordProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await requestPasswordReset(trimmedEmail);
      setIsSent(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to send the reset link. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSent) {
    return (
      <div className="animate-pop-in space-y-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <MailCheck size={26} />
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-800">
            Check your inbox
          </p>

          <p className="mt-1 text-sm text-slate-500">
            If an account exists for {email.trim()}, a reset link is on its way.
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToLogin}
          className="w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="forgot-email"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Email address
        </label>

        <input
          id="forgot-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@company.com"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="animate-pop-in rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <Loader2 size={17} className="animate-spin" />
        ) : (
          <KeyRound size={17} />
        )}
        {isSubmitting ? "Sending link..." : "Send reset link"}
      </button>

      <p className="text-center text-sm text-slate-500">
        <button
          type="button"
          onClick={onBackToLogin}
          className="font-semibold text-indigo-600 transition hover:text-indigo-700"
        >
          Back to sign in
        </button>
      </p>
    </form>
  );
}

export default ForgotPassword;
