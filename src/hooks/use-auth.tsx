import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async (uid: string, options?: { background?: boolean }) => {
    const background = options?.background ?? false;
    if (!background) setLoading(true);

    let lastError: unknown = null;

    try {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const [{ data: prof, error: profileError }, { data: roleRows, error: rolesError }] = await Promise.all([
          supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", uid),
        ]);

        // Profile missing for an authenticated user means the handle_new_user
        // trigger failed (common with Google OAuth on first sign-in).
        // Call the self-heal RPC once and retry — it's idempotent.
        if (!prof && !profileError && attempt === 1) {
          await supabase.rpc("ensure_user_bootstrap");
          await wait(500);
          continue;
        }

        if (!profileError) {
          setProfile((prof as Profile | null) ?? null);
        } else {
          console.error("Failed to load auth profile", profileError);
        }

        if (!rolesError) {
          setRoles(((roleRows ?? []) as { role: AppRole }[]).map((r) => r.role));
          return;
        }

        lastError = rolesError;
        console.error(`Failed to load auth roles (attempt ${attempt})`, rolesError);

        if (attempt < 3) {
          await wait(250 * attempt);
        }
      }
    } finally {
      if (lastError && !background) {
        console.error("Failed to load auth user data", lastError);
      }
      if (!background) setLoading(false);
    }
  }, []);

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
        setLoading(false);
      }
    });

    // 2) Then check existing session
    void supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      if (existing?.user) {
        void loadUserData(existing.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [loadUserData]);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return;

    const refreshInBackground = () => {
      void loadUserData(uid, { background: true });
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) refreshInBackground();
    };

    const channel = supabase
      .channel(`auth-sync-${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles", filter: `user_id=eq.${uid}` }, refreshInBackground)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${uid}` }, refreshInBackground)
      .subscribe();

    window.addEventListener("focus", refreshInBackground);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", refreshInBackground);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [session?.user?.id, loadUserData]);

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
