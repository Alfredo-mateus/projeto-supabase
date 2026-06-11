import { createContext, useContext, useEffect, useState } from "react";
  import type { User } from "@supabase/supabase-js";
  import { supabase, type Profile } from "./supabase";

  type AuthContextType = {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: Error | null; user: User | null }>;
    signOut: () => Promise<void>;
  };

  const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    signIn: async () => ({ error: null, user: null }),
    signOut: async () => {},
  });

  export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    async function loadProfile(userId: string) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      setProfile(data as Profile | null);
    }

    useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) loadProfile(u.id).finally(() => setLoading(false));
        else setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) loadProfile(u.id);
        else setProfile(null);
      });

      return () => subscription.unsubscribe();
    }, []);

    async function signIn(email: string, password: string) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error, user: null };
      return { error: null, user: data.user };
    }

    async function signOut() {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    }

    return (
      <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
        {children}
      </AuthContext.Provider>
    );
  }

  export function useAuth() {
    return useContext(AuthContext);
  }
  