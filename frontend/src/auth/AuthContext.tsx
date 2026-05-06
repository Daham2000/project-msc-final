import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { api, ApiError } from "../api/client";
import { clearAuth, getStoredToken, getStoredUser, saveAuth } from "../lib/storage";
import type { LoginPayload, RegisterPayload, User } from "../types/api";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  ready: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function parseStoredUser() {
  const raw = getStoredUser();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    clearAuth();
    return null;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<User | null>(() => parseStoredUser());
  const [ready, setReady] = useState(false);

  const logout = () => {
    clearAuth();
    setToken(null);
    setUser(null);
  };

  const persistAuth = (nextToken: string, nextUser: User) => {
    saveAuth(nextToken, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const login = async (payload: LoginPayload) => {
    const response = await api.login(payload);
    persistAuth(response.access_token, response.user);
  };

  const register = async (payload: RegisterPayload) => {
    await api.register(payload);
    await login({ email: payload.email, password: payload.password });
  };

  const refreshUser = async () => {
    if (!token) {
      return;
    }

    try {
      const response = await api.getCurrentUser(token);
      persistAuth(token, response.user);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        return;
      }
      throw error;
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!token) {
        setReady(true);
        return;
      }

      try {
        const response = await api.getCurrentUser(token);
        if (!cancelled) {
          persistAuth(token, response.user);
        }
      } catch {
        if (!cancelled) {
          logout();
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      ready,
      login,
      register,
      logout,
      refreshUser,
    }),
    [ready, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
