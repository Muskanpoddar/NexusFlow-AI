
import { useState, type FormEvent } from "react";
import {
  Building2,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import { formatRole } from "../features/auth/authService";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function ProfilePage() {
  const { user, updateProfile, changePassword } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      setProfileError("Enter your full name.");
      return;
    }

    setProfileError("");
    setProfileMessage("");
    setIsSavingProfile(true);

    try {
      await updateProfile(trimmedName);
      setProfileMessage("Profile updated.");
    } catch (caught) {
      setProfileError(
        caught instanceof Error
          ? caught.message
          : "Unable to update your profile."
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordError("");
    setPasswordMessage("");
    setIsSavingPassword(true);

    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMessage("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (caught) {
      setPasswordError(
        caught instanceof Error
          ? caught.message
          : "Unable to change your password."
      );
    } finally {
      setIsSavingPassword(false);
    }
  }

  const workspace = user?.workspaces[0];

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <div className="animate-fade-in">
        <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
          <span>Workspace</span>
          <span>/</span>
          <span className="text-indigo-600">Profile</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          My Profile
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Manage your account details, workspaces and password.
        </p>
      </div>

      <section className="animate-slide-up overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-center gap-5 border-b border-slate-100 p-6 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-violet-600 text-xl font-bold text-white shadow-lg shadow-blue-500/25">
            {initials(user?.name ?? "User")}
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h2 className="truncate text-lg font-bold text-slate-900">
              {user?.name}
            </h2>

            <p className="mt-0.5 flex items-center justify-center gap-1.5 text-sm text-slate-500 sm:justify-start">
              <Mail size={14} />
              {user?.email}
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600">
                {formatRole(workspace?.role ?? "MEMBER")}
              </span>

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                {workspace?.workspace.name ?? "No workspace"}
              </span>

              {user?.createdAt && (
                <span className="text-xs text-slate-400">
                  Joined{" "}
                  {new Date(user.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-2">
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="flex items-center gap-2">
              <User size={17} className="text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-800">
                Edit profile
              </h3>
            </div>

            <div>
              <label
                htmlFor="profile-name"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Full name
              </label>

              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Email address
              </label>

              <input
                id="profile-email"
                type="email"
                value={user?.email ?? ""}
                readOnly
                className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500 outline-none"
              />

              <p className="mt-1.5 text-xs text-slate-400">
                The email address identifies your account and cannot be changed
                here.
              </p>
            </div>

            {profileError && (
              <p
                role="alert"
                className="animate-pop-in rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600"
              >
                {profileError}
              </p>
            )}

            {profileMessage && (
              <p className="animate-pop-in flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-600">
                <CheckCircle2 size={15} />
                {profileMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSavingProfile}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingProfile && (
                <Loader2 size={15} className="animate-spin" />
              )}
              {isSavingProfile ? "Saving..." : "Save changes"}
            </button>
          </form>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound size={17} className="text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-800">
                Change password
              </h3>
            </div>

            <div>
              <label
                htmlFor="current-password"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Current password
              </label>

              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Your current password"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label
                htmlFor="new-password"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                New password
              </label>

              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Confirm new password
              </label>

              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat your new password"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {passwordError && (
              <p
                role="alert"
                className="animate-pop-in rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600"
              >
                {passwordError}
              </p>
            )}

            {passwordMessage && (
              <p className="animate-pop-in flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-600">
                <CheckCircle2 size={15} />
                {passwordMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSavingPassword}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingPassword && (
                <Loader2 size={15} className="animate-spin" />
              )}
              {isSavingPassword ? "Updating..." : "Update password"}
            </button>
          </form>
        </div>
      </section>

      <section className="animate-slide-up rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" style={{ animationDelay: "120ms" }}>
        <div className="flex items-center gap-2">
          <Building2 size={17} className="text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-800">
            Your workspaces
          </h3>
        </div>

        {user?.workspaces.length ? (
          <ul className="mt-4 space-y-2">
            {user.workspaces.map((membership) => (
              <li
                key={membership.workspace.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {membership.workspace.name}
                  </p>

                  <p className="text-xs text-slate-400">
                    {membership.workspace.slug}
                  </p>
                </div>

                <span className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600">
                  <ShieldCheck size={13} />
                  {formatRole(membership.role)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
            You are not a member of a workspace yet.
          </p>
        )}
      </section>
    </div>
  );
}

export default ProfilePage;
