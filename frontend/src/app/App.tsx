
import { useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

import Dashboard from "../pages/Dashboard";
import Projects from "../pages/Projects";
import ProjectDetails from "../pages/ProjectDetails";
import Tasks from "../pages/Tasks";
import Team from "../pages/Team";

import AIAssistant from "../features/ai-assistant/AIAssistant";

import AppProviders from "./providers";

function AppContent() {
  const [activePage, setActivePage] = useState("Overview");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );

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
        <Header pageTitle={pageTitle} />

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
