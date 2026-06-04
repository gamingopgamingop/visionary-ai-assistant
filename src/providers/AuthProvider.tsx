import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { supabase } from "@/integrations/supabase/client";
import { CLERK_PUBLISHABLE_KEY } from "@/config/clerk";

export type AuthProviderName = "clerk" | "supabase" | "fallback-pending" | "none";

interface AuthCtx {
  provider: AuthProviderName;
  userId: string | null;
  email: string | null;
  name: string | null;
  avatar: string | null;
  isSignedIn: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  provider: "none", userId: null, email: null, name: null, avatar: null,
  isSignedIn: false, isLoading: true, signOut: async () => {},
});

export const useCurrentUser = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const clerkOk = !!CLERK_PUBLISHABLE_KEY;
  const clerk = useAuth();
  const { user: clerkUser } = useUser();
  const [sbUser, setSbUser] = useState<{ id: string; email: string | null } | null>(null);
  const [sbReady, setSbReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setSbUser({ id: data.session.user.id, email: data.session.user.email ?? null });
      setSbReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSbUser(session?.user ? { id: session.user.id, email: session.user.email ?? null } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (clerkOk && clerk.isLoaded && clerk.isSignedIn && clerkUser) {
    return (
      <Ctx.Provider value={{
        provider: "clerk",
        userId: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
        name: clerkUser.fullName,
        avatar: clerkUser.imageUrl,
        isSignedIn: true,
        isLoading: false,
        signOut: async () => { await clerk.signOut(); },
      }}>{children}</Ctx.Provider>
    );
  }

  if (sbUser) {
    return (
      <Ctx.Provider value={{
        provider: "supabase",
        userId: sbUser.id,
        email: sbUser.email,
        name: sbUser.email,
        avatar: null,
        isSignedIn: true,
        isLoading: false,
        signOut: async () => { await supabase.auth.signOut(); },
      }}>{children}</Ctx.Provider>
    );
  }

  return (
    <Ctx.Provider value={{
      provider: clerkOk ? "clerk" : "fallback-pending",
      userId: null, email: null, name: null, avatar: null,
      isSignedIn: false,
      isLoading: clerkOk ? !clerk.isLoaded : !sbReady,
      signOut: async () => {},
    }}>{children}</Ctx.Provider>
  );
}
