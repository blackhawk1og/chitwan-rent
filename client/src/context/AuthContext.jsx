import { createContext, useCallback, useContext, useState } from "react";
import { postJson } from "../lib/api.js";
import { getStoredSession, setStoredSession, clearStoredSession } from "../lib/authStorage.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getStoredSession);

  const login = useCallback(async ({ email, phone, name }) => {
    const data = await postJson("/auth/login", { email, phone, name });
    setStoredSession(data);
    setSession(data);
    return data;
  }, []);

  const logout = useCallback(() => {
    clearStoredSession();
    setSession(null);
  }, []);

  const value = {
    user: session?.user ?? null,
    isAuthenticated: Boolean(session?.token),
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
