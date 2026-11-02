import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { clearAccountData } from "@/db/repositories/backup.repo";
import {
  type AuthUser,
  changePasswordRequest,
  fetchSession,
  loginRequest,
  logoutRequest,
  type RegisterInput,
  registerRequest,
} from "@/lib/api";
import {
  clearCachedUser,
  clearSyncMeta,
  readCachedUser,
  writeCachedUser,
} from "@/lib/authStorage";
import { withoutLocalChangeNotifications } from "@/lib/syncEvents";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  offline: boolean;
  serverError: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  retrySession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [offline, setOffline] = useState(false);
  const [serverError, setServerError] = useState(false);

  const applyUser = useCallback((nextUser: AuthUser, isOffline = false) => {
    writeCachedUser(nextUser);
    setUser(nextUser);
    setOffline(isOffline);
    setServerError(false);
    setStatus("authenticated");
  }, []);

  const verifySession = useCallback(async () => {
    const cached = readCachedUser();

    if (!navigator.onLine && cached) {
      applyUser(cached, true);
      return;
    }

    setStatus("loading");
    setServerError(false);

    try {
      const sessionUser = await fetchSession();
      if (sessionUser) {
        applyUser(sessionUser, false);
      } else {
        clearCachedUser();
        setUser(null);
        setOffline(false);
        setStatus("unauthenticated");
      }
    } catch {
      if (cached) {
        applyUser(cached, true);
        return;
      }

      setUser(null);
      setOffline(false);
      setStatus("unauthenticated");
      setServerError(true);
    }
  }, [applyUser]);

  useEffect(() => {
    void verifySession();
  }, [verifySession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const nextUser = await loginRequest(email, password);
      applyUser(nextUser, false);
    },
    [applyUser],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const nextUser = await registerRequest(input);
      applyUser(nextUser, false);
    },
    [applyUser],
  );

  const logout = useCallback(async () => {
    await logoutRequest();

    try {
      await withoutLocalChangeNotifications(async () => {
        await clearAccountData();
      });
    } catch {
      /* La sesión ya fue revocada; la copia local se limpia al volver a entrar. */
    }

    clearCachedUser();
    clearSyncMeta();
    setUser(null);
    setOffline(false);
    setServerError(false);
    setStatus("unauthenticated");
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await changePasswordRequest(currentPassword, newPassword);
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      offline,
      serverError,
      login,
      register,
      logout,
      changePassword,
      retrySession: verifySession,
    }),
    [
      changePassword,
      login,
      logout,
      offline,
      register,
      serverError,
      status,
      user,
      verifySession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider.");
  return context;
}
