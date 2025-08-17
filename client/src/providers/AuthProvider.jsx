import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { setTokens, clearTokens } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      try {
        const { data } = await api.get("/auth/me");
        if (mounted) setUser(data.user);
      } catch {
        // no existing session
      } finally {
        if (mounted) setBooting(false);
      }
    }
    bootstrap();
    return () => { mounted = false; };
  }, []);

  const actions = useMemo(() => ({
    async register({ email, password, displayName }) {
      const { data } = await api.post("/auth/register", { email, password, displayName });
      setTokens(data.access, data.refresh);
      const me = await api.get("/auth/me");
      setUser(me.data.user);
      return me.data.user;
    },
    async login({ email, password }) {
      const { data } = await api.post("/auth/login", { email, password });
      setTokens(data.access, data.refresh);
      const me = await api.get("/auth/me");
      setUser(me.data.user);
      return me.data.user;
    },
    async logout() {
      try { await api.post("/auth/logout"); } catch {}
      clearTokens();
      setUser(null);
    }
  }), []);

  const value = useMemo(() => ({ user, booting, ...actions }), [user, booting, actions]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
