
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  changePassword as changePasswordRequest,
  clearStoredSession,
  fetchCurrentUser,
  loginUser,
  readStoredToken,
  registerUser,
  storeSession,
  updateProfile as updateProfileRequest,
  type AuthProfile,
} from "./authService";

export interface AuthContextValue {
  user: AuthProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateProfile: (name: string) => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Keep the session across refreshes, but only while the token still works.
  useEffect(() => {
    const storedToken = readStoredToken();

    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    let active = true;

    fetchCurrentUser(storedToken)
      .then((profile) => {
        if (!active) return;

        setToken(storedToken);
        setUser(profile);
      })
      .catch(() => {
        if (!active) return;

        clearStoredSession();
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const session = await loginUser({ email, password });

    storeSession(session.accessToken, session.user);
    setToken(session.accessToken);
    setUser({ ...session.user, workspaces: session.workspaces });
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const session = await registerUser({ name, email, password });

      storeSession(session.accessToken, session.user);
      setToken(session.accessToken);
      setUser({ ...session.user, workspaces: session.workspaces });
    },
    []
  );

  const logout = useCallback(() => {
    clearStoredSession();
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;

    setUser(await fetchCurrentUser(token));
  }, [token]);

  const updateProfile = useCallback(
    async (name: string) => {
      if (!token) return;

      const updated = await updateProfileRequest(token, { name });

      setUser((current) => (current ? { ...current, ...updated } : current));
    },
    [token]
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!token) return;

      await changePasswordRequest(token, { currentPassword, newPassword });
    },
    [token]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading,
      login,
      register,
      logout,
      refreshUser,
      updateProfile,
      changePassword,
    }),
    [
      user,
      token,
      isLoading,
      login,
      register,
      logout,
      refreshUser,
      updateProfile,
      changePassword,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
