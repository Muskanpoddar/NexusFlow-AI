
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

import { resetPassword } from "./authService";

interface ResetPasswordProps {
  token: string;
  onBackToLogin: () => void;
}

function ResetPassword({ token, onBackToLogin }: ResetPasswordProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await resetPassword({ token, newPassword: password });
      setIsDone(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to reset your password. The link may have expired."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isDone) {
    return (
      <div className="animate-pop-in space-y-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <ShieldCheck size={26} />
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-800">
            Password updated
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Your new password is ready. Sign in with it now.
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToLogin}
          className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          Go to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="reset-password"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          New password
        </label>

        <div className="relative">
          <input
            id="reset-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-11 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />

          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div>
        <label
          htmlFor="reset-confirm"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Confirm new password
        </label>

        <input
          id="reset-confirm"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Repeat your new password"
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
          <ShieldCheck size={17} />
        )}
        {isSubmitting ? "Updating..." : "Update password"}
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

export default ResetPassword;
