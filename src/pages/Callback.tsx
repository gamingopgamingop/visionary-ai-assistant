import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Callback() {
  const nav = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      nav(data.session ? "/workspace" : "/");
    });
  }, [nav]);
  return <main className="container py-20 text-center text-muted-foreground">Signing you in…</main>;
}
