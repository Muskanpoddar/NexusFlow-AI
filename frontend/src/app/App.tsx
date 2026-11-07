
import { useState } from "react";
import { Loader2 } from "lucide-react";

import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

import Dashboard from "../pages/Dashboard";
import Projects from "../pages/Projects";
import ProjectDetails from "../pages/ProjectDetails";
import Tasks from "../pages/Tasks";
import Team from "../pages/Team";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import ProfilePage from "../pages/ProfilePage";
import Settings from "../pages/Settings";
import HelpSupport from "../pages/HelpSupport";

import AIAssistant from "../features/ai-assistant/AIAssistant";
import AuthLayout from "../features/auth/AuthLayout";
import ResetPassword from "../features/auth/ResetPassword";

import { useAuth } from "../hooks/useAuth";
import AppProviders from "./providers";

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  const [activePage, setActivePage] = useState("Overview");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [authView, setAuthView] = useState<"login" | "register">("login");

  const resetToken = new URLSearchParams(window.location.search).get(
    "resetToken"
  );

  function clearResetToken() {
    window.history.replaceState({}, "", window.location.pathname);
  }

  function openProject(projectId: string) {
    setSelectedProjectId(projectId);
    setActivePage("Projects");
  }

  function backToProjects() {
    setSelectedProjectId(null);
    setActivePage("Projects");
  }

  function handleNavigation(page: string) {
    setSelectedProjectId(null);
    setActivePage(page);
  }

  if (resetToken) {
    return (
      <AuthLayout
        title="Choose a new password"
        subtitle="Your reset link is valid for one use."
      >
        <ResetPassword
          token={resetToken}
          onBackToLogin={() => {
            clearResetToken();
            setAuthView("login");
          }}
        />
      </AuthLayout>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 size={28} className="animate-spin text-blue-600" />

          <p className="text-sm font-medium">Restoring your session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return authView === "login" ? (
      <LoginPage
        onSwitchToRegister={() => setAuthView("register")}
      />
    ) : (
      <RegisterPage onSwitchToLogin={() => setAuthView("login")} />
    );
  }

  const renderPage = () => {
    if (activePage === "Projects" && selectedProjectId) {
      return (
        <ProjectDetails
          projectId={selectedProjectId}
          onBack={backToProjects}
        />
      );
    }

    switch (activePage) {
      case "Overview":
        return <Dashboard />;

      case "Projects":
        return <Projects onOpenProject={openProject} />;

      case "My Tasks":
        return <Tasks />;

      case "AI Assistant":
        return <AIAssistant onOpenProject={openProject} />;

      case "Team Members":
        return <Team />;

      case "Profile":
        return <ProfilePage />;

      case "Settings":
        return <Settings onOpenProfile={() => handleNavigation("Profile")} />;

      case "Help & Support":
        return <HelpSupport />;

      default:
        return (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-lg font-semibold text-slate-800">
              {activePage}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              This module is coming in a later development phase.
            </p>
          </div>
        );
    }
  };

  const pageTitle =
    activePage === "Projects" && selectedProjectId
      ? "Project Details"
      : activePage;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigation}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          pageTitle={pageTitle}
          onNavigate={handleNavigation}
          onOpenProject={openProject}
        />

        <main className="min-w-0 flex-1 overflow-y-auto p-5 sm:p-8">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}
