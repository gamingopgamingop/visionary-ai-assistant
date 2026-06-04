import { Link, NavLink } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Sparkles } from "lucide-react";
import { useCurrentUser } from "@/providers/AuthProvider";
import { CLERK_PUBLISHABLE_KEY } from "@/config/clerk";
import ClerkAuth from "@/components/ClerkAuth";
import FallbackAuthModal from "@/components/FallbackAuthModal";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/workspace", label: "Workspace" },
];

const linkCls = ({ isActive }: { isActive: boolean }) =>
  cn("text-sm font-medium transition-colors hover:text-foreground",
    isActive ? "text-foreground" : "text-muted-foreground");

export default function Navbar() {
  const { provider, isSignedIn, email, avatar, signOut } = useCurrentUser();
  const [authOpen, setAuthOpen] = useState(false);
  const [mobile, setMobile] = useState(false);

  const useClerkUI = !!CLERK_PUBLISHABLE_KEY && (provider === "clerk" || provider === "fallback-pending");

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border backdrop-blur-md bg-background/80">
      <div className="container flex h-14 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            AI Image Toolkit
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {LINKS.map((l) => <NavLink key={l.to} to={l.to} end={l.to === "/"} className={linkCls}>{l.label}</NavLink>)}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {useClerkUI ? (
            <ClerkAuth />
          ) : isSignedIn ? (
            <div className="flex items-center gap-2">
              {avatar && <img src={avatar} alt="" className="h-7 w-7 rounded-full" />}
              <span className="text-sm text-muted-foreground max-w-[160px] truncate">{email}</span>
              <Button size="sm" variant="ghost" onClick={signOut}>Sign out</Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => setAuthOpen(true)}>Sign in</Button>
          )}
        </div>

        <Sheet open={mobile} onOpenChange={setMobile}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden"><Menu className="h-5 w-5" /></Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <div className="flex flex-col gap-4 mt-8">
              {LINKS.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.to === "/"} className={linkCls} onClick={() => setMobile(false)}>
                  {l.label}
                </NavLink>
              ))}
              <div className="border-t pt-4">
                {useClerkUI ? <ClerkAuth /> : isSignedIn ? (
                  <Button variant="ghost" onClick={signOut}>Sign out</Button>
                ) : (
                  <Button onClick={() => { setAuthOpen(true); setMobile(false); }}>Sign in</Button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <FallbackAuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </header>
  );
}
