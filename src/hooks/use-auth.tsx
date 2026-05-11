import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "contractor" | "corporation" | "admin";

export type Profile = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  company_name: string | null;
  city: string | null;
  avatar_url: string | null;
  is_verified: boolean;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  hasRole: (role: AppRole) => boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (uid: string) => {
    const [{ data: prof }, { data: roleRows }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((prof as Profile | null) ?? null);
    setRoles(((roleRows ?? []) as { role: AppRole }[]).map((r) => r.role));
  };

  useEffect(() => {
    // 1) Set up listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        // Defer to avoid deadlocks inside the listener
        setTimeout(() => {
          void loadUserData(newSession.user.id);
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });

    // 2) Then check existing session
    void supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      if (existing?.user) {
        void loadUserData(existing.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      roles,
      loading,
      hasRole: (r) => roles.includes(r),
      signOut: async () => {
        await supabase.auth.signOut();
      },
      refresh: async () => {
        if (session?.user) await loadUserData(session.user.id);
      },
    }),
    [session, profile, roles, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
