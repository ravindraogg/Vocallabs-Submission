"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import nhost from "@/lib/nhost";
import { secureSet, secureGet, secureDelete } from "@/lib/secureDB";

interface User {
  id: string;
  email: string;
  displayName: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<{ error: string | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  signUp: async () => ({ error: "Not initialised" }),
  signIn: async () => ({ error: "Not initialised" }),
  signOut: async () => {},
});

// Helper to extract error message from Nhost FetchError
function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object") {
    // FetchError has .body which is the parsed JSON from Nhost
    const fetchErr = err as { body?: { message?: string; error?: string }; message?: string };
    const msg =
      fetchErr.body?.message ||
      fetchErr.body?.error ||
      fetchErr.message ||
      fallback;
    console.error("[Nhost Auth Error]", fetchErr.body || fetchErr);
    return msg;
  }
  return fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Persist user to IndexedDB whenever it changes
  const persistUser = useCallback(async (u: User | null) => {
    if (u) {
      await secureSet("current_user", u);
    } else {
      await secureDelete("current_user");
    }
  }, []);

  // On mount — check Nhost stored session, then fallback to IndexedDB
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const storedSession = nhost.getUserSession();

      if (storedSession && storedSession.accessToken) {
        const cached = await secureGet<User>("current_user");
        if (cached && !cancelled) {
          setUser(cached);
        }
      } else {
        const cached = await secureGet<User>("current_user");
        if (cached && !cancelled) {
          await secureDelete("current_user");
        }
      }

      if (!cancelled) setLoading(false);
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [persistUser]);

  // ── Sign Up ──────────────────────────────────────────────────
  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      try {
        const response = await nhost.auth.signUpEmailPassword({
          email,
          password,
          options: { displayName: displayName || email.split("@")[0] },
        });

        const session = response.body.session;
        if (session?.user) {
          const u: User = {
            id: session.user.id,
            email: session.user.email || "",
            displayName:
              session.user.displayName || session.user.email || "",
          };
          setUser(u);
          await persistUser(u);
        } else {
          // Email verification required — user created but no session yet
          // Still treat as success so the UI can show a message
          return { error: null };
        }
        return { error: null };
      } catch (err: unknown) {
        return { error: extractErrorMessage(err, "Sign up failed") };
      }
    },
    [persistUser]
  );

  // ── Sign In ──────────────────────────────────────────────────
  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const response = await nhost.auth.signInEmailPassword({
          email,
          password,
        });

        const session = response.body.session;
        if (session?.user) {
          const u: User = {
            id: session.user.id,
            email: session.user.email || "",
            displayName:
              session.user.displayName || session.user.email || "",
          };
          setUser(u);
          await persistUser(u);
        }
        return { error: null };
      } catch (err: unknown) {
        return { error: extractErrorMessage(err, "Sign in failed") };
      }
    },
    [persistUser]
  );

  // ── Sign Out ─────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    try {
      const storedSession = nhost.getUserSession();
      if (storedSession?.refreshToken) {
        await nhost.auth.signOut({
          refreshToken: storedSession.refreshToken,
        });
      }
    } catch {
      // Ignore — token may already be expired
    }
    nhost.clearSession();
    setUser(null);
    await persistUser(null);
  }, [persistUser]);

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
