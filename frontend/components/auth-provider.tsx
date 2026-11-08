"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AuthUser } from "@/lib/api";

const STORAGE_KEY = "parki_session";
const LEGACY_STORAGE_KEY = "parkingia_session";

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

function readSession(): AuthSession | null {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Migración de una sola vez desde la key anterior (rebrand a "Parki", hoy AxPark),
      // para no desloguear a nadie con sesión activa tras el despliegue.
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        localStorage.setItem(STORAGE_KEY, legacy);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        raw = legacy;
      }
    }
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

const AuthContext = createContext<{
  session: AuthSession | null;
  loading: boolean;
  setSession: (session: AuthSession) => void;
  logout: () => void;
}>({
  session: null,
  loading: true,
  setSession: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    // localStorage no existe en SSR; la sesión solo puede leerse tras montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionState(readSession());
    setLoading(false);
  }, []);

  function setSession(next: AuthSession) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSessionState(next);
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setSessionState(null);
    queryClient.clear();
  }

  return (
    <AuthContext.Provider value={{ session, loading, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
