import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Fallback auth modal — activates when Clerk is unavailable or you wire up
 * Logto / Auth0 / FusionAuth via env vars (VITE_LOGTO_*, VITE_AUTH0_*, VITE_FUSIONAUTH_*).
 * Today it supports Supabase email/password + Google OAuth and provides
 * placeholder buttons for the other providers.
 */

const SOCIAL_PROVIDERS = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
  { id: "discord", label: "Discord" },
  { id: "azure", label: "Microsoft" },
  { id: "apple", label: "Apple" },
  { id: "facebook", label: "Facebook" },
];

export default function FallbackAuthModal({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const fn = mode === "signin" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
      const { error } = await fn({ email, password });
      if (error) throw error;
      toast.success(mode === "signin" ? "Signed in" : "Account created — check your email");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  const social = async (provider: string) => {
    if (provider !== "google") {
      toast.info(`${provider} needs Logto/Auth0/FusionAuth env vars wired up.`);
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google" as never,
      options: { redirectTo: `${window.location.origin}/callback` },
    });
    if (error) toast.error(error.message);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in</DialogTitle>
          <DialogDescription>Backup authentication — Clerk unavailable or disabled.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {SOCIAL_PROVIDERS.map((p) => (
            <Button key={p.id} variant="outline" size="sm" onClick={() => social(p.id)}>{p.label}</Button>
          ))}
        </div>

        <div className="flex items-center gap-2 my-2">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or continue with email</span>
          <Separator className="flex-1" />
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin" className="space-y-3 pt-3">
            <EmailFields email={email} setEmail={setEmail} password={password} setPassword={setPassword} />
            <Button className="w-full" onClick={submit} disabled={busy}>Sign in</Button>
          </TabsContent>
          <TabsContent value="signup" className="space-y-3 pt-3">
            <EmailFields email={email} setEmail={setEmail} password={password} setPassword={setPassword} />
            <Button className="w-full" onClick={submit} disabled={busy}>Create account</Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function EmailFields({ email, setEmail, password, setPassword }: {
  email: string; setEmail: (s: string) => void; password: string; setPassword: (s: string) => void;
}) {
  return (
    <>
      <div className="space-y-1">
        <Label htmlFor="fa-email">Email</Label>
        <Input id="fa-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="fa-pw">Password</Label>
        <Input id="fa-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
    </>
  );
}
