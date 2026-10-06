import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { completeOidcLogin } from "@/lib/oidc";

export default function Callback() {
  const nav = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        if (await completeOidcLogin(window.location.search)) { nav("/gallery"); return; }
        const { data } = await supabase.auth.getSession();
        nav(data.session ? "/workspace" : "/");
      } catch (e) { setErr((e as Error).message); }
    })();
  }, [nav]);
  return <main className="container py-20 text-center text-muted-foreground">{err ?? "Signing you in…"}</main>;
}
