import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useAuth, useUser } from "@clerk/react";
import { supabase } from "@/integrations/supabase/client";
import { CLERK_PUBLISHABLE_KEY } from "@/config/clerk";
import { getOidcSession, oidcSignOut, type OidcSession } from "@/lib/oidc";
import { setTokenGetter } from "@/lib/gallery-api";

export type AuthProviderName = "clerk" | "supabase" | "zitadel" | "logto" | "better-auth" | "fallback-pending" | "none";

interface AuthCtx {
  provider: AuthProviderName;
  userId: string | null;
  email: string | null;
  name: string | null;
  avatar: string | null;
  isSignedIn: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const Ctx = createContext<AuthCtx>({
  provider: "none", userId: null, email: null, name: null, avatar: null,
  isSignedIn: false, isLoading: true, signOut: async () => {}, getToken: async () => null,
});

export const useCurrentUser = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const clerkOk = !!CLERK_PUBLISHABLE_KEY;
  const clerk = useAuth();
  const { user: clerkUser } = useUser();
  const [sbUser, setSbUser] = useState<{ id: string; email: string | null } | null>(null);
  const [sbReady, setSbReady] = useState(false);
  const [oidc, setOidc] = useState<OidcSession | null>(getOidcSession());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setSbUser({ id: data.session.user.id, email: data.session.user.email ?? null });
      setSbReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSbUser(session?.user ? { id: session.user.id, email: session.user.email ?? null } : null);
    });
    const onOidc = () => setOidc(getOidcSession());
    window.addEventListener("oidc-change", onOidc);
    return () => { sub.subscription.unsubscribe(); window.removeEventListener("oidc-change", onOidc); };
  }, []);

  const clerkSignedIn = clerkOk && clerk.isLoaded && clerk.isSignedIn && !!clerkUser;

  const getToken = useCallback(async (): Promise<string | null> => {
    if (clerkSignedIn) return (await clerk.getToken()) ?? null;
    if (oidc) return oidc.idToken;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, [clerkSignedIn, clerk, oidc]);

  useEffect(() => { setTokenGetter(getToken); }, [getToken]);

  let value: AuthCtx;
  if (clerkSignedIn && clerkUser) {
    value = {
      provider: "clerk", userId: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
      name: clerkUser.fullName, avatar: clerkUser.imageUrl,
      isSignedIn: true, isLoading: false,
      signOut: async () => { await clerk.signOut(); }, getToken,
    };
  } else if (oidc) {
    value = {
      provider: oidc.provider, userId: `${oidc.provider}:${oidc.sub}`,
      email: oidc.email, name: oidc.name, avatar: oidc.picture,
      isSignedIn: true, isLoading: false,
      signOut: async () => oidcSignOut(), getToken,
    };
  } else if (sbUser) {
    value = {
      provider: "supabase", userId: sbUser.id, email: sbUser.email, name: sbUser.email, avatar: null,
      isSignedIn: true, isLoading: false,
      signOut: async () => { await supabase.auth.signOut(); }, getToken,
    };
  } else {
    value = {
      provider: clerkOk ? "clerk" : "fallback-pending",
      userId: null, email: null, name: null, avatar: null, isSignedIn: false,
      isLoading: clerkOk ? !clerk.isLoaded : !sbReady,
      signOut: async () => {}, getToken,
    };
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
