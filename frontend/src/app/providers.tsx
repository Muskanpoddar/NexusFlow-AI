
import type { ReactNode } from "react";
import { WorkspaceProvider } from "../store/workspace.store";
import { AuthProvider } from "../features/auth/AuthProvider";

interface AppProvidersProps {
  children: ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <WorkspaceProvider>{children}</WorkspaceProvider>
    </AuthProvider>
  );
}
