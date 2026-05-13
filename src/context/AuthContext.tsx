import React, { createContext, useContext, useState, useEffect } from "react";
import { getStoredSession } from "@/services/authService";
import { supabase } from "@/lib/supabase";

export interface SessionUser {
  user_id: string;
  client_id: string;
  client_name: string;
  role: string;
  email?: string;
  full_name?: string;
}

interface AuthContextValue {
  user: SessionUser | null;
  setUser: (user: SessionUser | null) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_KEY = "erp_user";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUserState] = useState<SessionUser | null>(() => {
    try {
      const raw = sessionStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const setUser = (u: SessionUser | null) => {
    setUserState(u);
    try {
      if (u) sessionStorage.setItem(USER_KEY, JSON.stringify(u));
      else sessionStorage.removeItem(USER_KEY);
    } catch {}
  };

  // Validate session still exists
  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      setUser(null);
      return;
    }
    // Restore session into Supabase client so JWT is sent with every query
    supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
