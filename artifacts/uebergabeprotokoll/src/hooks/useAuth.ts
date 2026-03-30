import { useState, useCallback, useEffect } from "react";
import i18n, { setLanguage } from "../i18n";

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
        setLanguage(data.user.preferredLanguage ?? "de-CH");
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
        setLanguage(data.user.preferredLanguage ?? "de-CH");
        setState({ user: data.user, account: data.account, loading: false });
        return {};
      } else {
        const err = await res.json() as { error: string };
        return { error: err.error ?? i18n.t("auth.loginFailed") };
      }
    } catch {
      return { error: i18n.t("auth.connectionError") };
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
        return { error: err.error ?? i18n.t("auth.registerFailed") };
      }
    } catch {
      return { error: i18n.t("auth.connectionError") };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {}
    setState({ user: null, account: null, loading: false });
  }, []);

  const updateLanguage = useCallback(async (lang: string): Promise<void> => {
    try {
      const res = await apiFetch("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ preferredLanguage: lang }),
      });
      if (res.ok) {
        const data = await res.json() as { user: AuthUser };
        setLanguage(data.user.preferredLanguage ?? "de-CH");
        setState(prev => prev.user ? { ...prev, user: { ...prev.user, preferredLanguage: data.user.preferredLanguage } } : prev);
      }
    } catch {
      // ignore
    }
  }, []);

  return {
    ...state,
    isAuthenticated: !!state.user,
    login,
    register,
    logout,
    checkSession,
    updateLanguage,
  };
}
