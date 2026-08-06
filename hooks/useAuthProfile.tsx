"use client";

import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AuthProfile = {
  role: "admin" | "player";
  player_id: number | null;
  player_name: string | null;
  username: string | null;
};

export type InitialAuthState = {
  user: { id: string; email: string | null } | null;
  profile: AuthProfile | null;
};

type ProfileRow = {
  id: string;
  role: "admin" | "player";
  player_id: number | null;
  player_name: string | null;
  username?: string | null;
};

type MeResponse = {
  user: { id: string; email: string | null } | null;
  profile: ProfileRow | null;
};

type AuthProfileContextValue = {
  user: User | null;
  profile: AuthProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isPlayer: boolean;
  ensureProfile: () => Promise<void>;
};

const AuthProfileContext = createContext<AuthProfileContextValue | null>(null);

function mapProfile(row: ProfileRow): AuthProfile {
  return {
    role: row.role,
    player_id: row.player_id,
    player_name: row.player_name,
    username: row.username ?? null,
  };
}

async function loadProfileFromRpc(
  supabase: ReturnType<typeof createClient>,
  ensure: boolean
): Promise<AuthProfile | null> {
  const fn = ensure ? "ensure_my_profile" : "get_my_profile";
  const { data, error } = await supabase.rpc(fn);

  if (error || !data?.[0]) return null;

  return mapProfile(data[0] as ProfileRow);
}

function userFromInitial(initial: InitialAuthState["user"]): User | null {
  if (!initial) return null;
  return {
    id: initial.id,
    email: initial.email ?? undefined,
  } as User;
}

function usersEqual(a: User | null, b: User | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.id === b.id && (a.email ?? null) === (b.email ?? null);
}

function profilesEqual(a: AuthProfile | null, b: AuthProfile | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    a.role === b.role &&
    a.player_id === b.player_id &&
    a.player_name === b.player_name &&
    a.username === b.username
  );
}

export function AuthProfileProvider({
  children,
  initialAuth,
}: {
  children: ReactNode;
  initialAuth: InitialAuthState;
}) {
  const [user, setUser] = useState<User | null>(() =>
    userFromInitial(initialAuth.user)
  );
  const [profile, setProfile] = useState<AuthProfile | null>(
    initialAuth.profile
  );
  const [loading, setLoading] = useState(false);

  const loadAuth = useCallback(async (tryEnsure = false) => {
    const supabase = createClient();

    try {
      const response = await fetch("/api/me", { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as MeResponse;

        if (data.user) {
          const nextUser = {
            id: data.user.id,
            email: data.user.email ?? undefined,
          } as User;
          setUser((prev) => (usersEqual(prev, nextUser) ? prev : nextUser));
        } else {
          setUser((prev) => (prev === null ? prev : null));
        }

        if (data.profile) {
          const nextProfile = mapProfile(data.profile);
          setProfile((prev) =>
            profilesEqual(prev, nextProfile) ? prev : nextProfile
          );
        } else if (tryEnsure) {
          const ensured = await loadProfileFromRpc(supabase, true);
          setProfile((prev) =>
            profilesEqual(prev, ensured) ? prev : ensured
          );
        } else {
          setProfile((prev) => (prev === null ? prev : null));
        }

        setLoading(false);
        return;
      }
    } catch {
      // fallback below
    }

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    setUser((prev) => (usersEqual(prev, authUser) ? prev : authUser));

    if (!authUser) {
      setProfile((prev) => (prev === null ? prev : null));
      setLoading(false);
      return;
    }

    let nextProfile = await loadProfileFromRpc(supabase, tryEnsure);
    if (!nextProfile && !tryEnsure) {
      nextProfile = await loadProfileFromRpc(supabase, true);
    }

    setProfile((prev) =>
      profilesEqual(prev, nextProfile) ? prev : nextProfile
    );
    setLoading(false);
  }, []);

  const ensureProfile = useCallback(async () => {
    setLoading(true);
    await loadAuth(true);
  }, [loadAuth]);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION") return;
      void loadAuth(false);
    });

    const syncTimer = window.setTimeout(() => {
      void loadAuth(false);
    }, 8000);

    return () => {
      window.clearTimeout(syncTimer);
      subscription.unsubscribe();
    };
  }, [loadAuth]);

  const value = useMemo<AuthProfileContextValue>(
    () => ({
      user,
      profile,
      loading,
      isAdmin: profile?.role === "admin",
      isPlayer: profile?.role === "player",
      ensureProfile,
    }),
    [user, profile, loading, ensureProfile]
  );

  return (
    <AuthProfileContext.Provider value={value}>
      {children}
    </AuthProfileContext.Provider>
  );
}

export function useAuthProfile() {
  const context = useContext(AuthProfileContext);

  if (!context) {
    throw new Error("useAuthProfile must be used within AuthProfileProvider");
  }

  return context;
}
