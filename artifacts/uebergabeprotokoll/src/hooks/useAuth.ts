import { useState, useCallback, useEffect } from "react";

export interface AuthUser {
  id: string;
  accountId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "owner" | "administrator" | "property_manager";
  isSuperAdmin: boolean;
  preferredLanguage: string;
}

export interface AuthAccount {
  id: string;
  name: string;
  plan: "free" | "privat" | "agentur" | "custom";
}

export interface AuthState {
  user: AuthUser | null;
  account: AuthAccount | null;
  loading: boolean;
}

const API_BASE = "/api";

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
  return res;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    account: null,
    loading: true,
  });

  const checkSession = useCallback(async () => {
    try {
      const res = await apiFetch("/auth/me");
      if (res.ok) {
        const data = await res.json() as { user: AuthUser; account: AuthAccount };
        setState({ user: data.user, account: data.account, loading: false });
      } else {
        setState({ user: null, account: null, loading: false });
      }
    } catch {
      setState({ user: null, account: null, loading: false });
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json() as { user: AuthUser; account: AuthAccount };
        setState({ user: data.user, account: data.account, loading: false });
        return {};
      } else {
        const err = await res.json() as { error: string };
        return { error: err.error ?? "Anmeldung fehlgeschlagen" };
      }
    } catch {
      return { error: "Verbindungsfehler. Bitte erneut versuchen." };
    }
  }, []);

  const register = useCallback(async (opts: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    accountName: string;
  }): Promise<{ error?: string }> => {
    try {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify(opts),
      });
      if (res.ok) {
        const data = await res.json() as { user: AuthUser; account: AuthAccount };
        setState({ user: data.user, account: data.account, loading: false });
        return {};
      } else {
        const err = await res.json() as { error: string };
        return { error: err.error ?? "Registrierung fehlgeschlagen" };
      }
    } catch {
      return { error: "Verbindungsfehler. Bitte erneut versuchen." };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {}
    setState({ user: null, account: null, loading: false });
  }, []);

  return {
    ...state,
    isAuthenticated: !!state.user,
    login,
    register,
    logout,
    checkSession,
  };
}
