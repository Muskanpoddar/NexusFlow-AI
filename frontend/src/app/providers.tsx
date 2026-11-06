
import type { ReactNode } from "react";
import { WorkspaceProvider } from "../store/workspace.store";

interface AppProvidersProps {
  children: ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <WorkspaceProvider>
      {children}
    </WorkspaceProvider>
  );
}
