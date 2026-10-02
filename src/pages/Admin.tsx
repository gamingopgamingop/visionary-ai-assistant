import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useCurrentUser } from "@/providers/AuthProvider";
import { galleryApi, type GalleryItem, type Role } from "@/lib/gallery-api";

export default function Admin() {
  const { isSignedIn, isLoading } = useCurrentUser();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [roles, setRoles] = useState<{ user_id: string; role: Role }[]>([]);
  const [plans, setPlans] = useState<{ user_id: string; plan: string }[]>([]);
  const [uid, setUid] = useState("");
  const [role, setRole] = useState<Role>("moderator");

  const load = useCallback(async () => {
    try {
      const r = await galleryApi.adminList();
      setItems(r.items); setRoles(r.roles); setPlans(r.plans); setAllowed(true);
    } catch (e) {
      setAllowed(false);
      if ((e as { status?: number }).status !== 403) toast.error((e as Error).message);
    }
  }, []);

  useEffect(() => { if (isSignedIn) load(); }, [isSignedIn, load]);

  const assign = async (userId: string, r: Role, revoke = false) => {
    try { await galleryApi.setRole(userId, r, revoke); toast.success(revoke ? "Role removed" : "Role granted"); load(); }
    catch (e) { toast.error((e as Error).message); }
  };

  const unpublish = async (it: GalleryItem) => {
    try { await galleryApi.update(it.id, { isPublic: false }); load(); } catch (e) { toast.error((e as Error).message); }
  };
  const del = async (it: GalleryItem) => {
    if (!confirm("Delete this item permanently?")) return;
    try { await galleryApi.remove(it.id); load(); } catch (e) { toast.error((e as Error).message); }
  };

  if (isLoading) return null;
  if (!isSignedIn) return <main className="container py-24 text-center text-muted-foreground">Sign in to continue.</main>;
  if (allowed === false) return <main className="container py-24 text-center"><h1 className="text-xl font-semibold">Admins only</h1><p className="text-muted-foreground">Your account doesn't have the admin role.</p></main>;
  if (allowed === null) return <main className="container py-24 text-center text-muted-foreground">Checking access…</main>;

  return (
    <main className="container py-8 space-y-10">
      <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Roles</h2>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="User ID" value={uid} onChange={(e) => setUid(e.target.value)} className="max-w-sm" />
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{(["admin", "moderator", "user"] as Role[]).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
          <Button disabled={!uid} onClick={() => { assign(uid.trim(), role); setUid(""); }}>Grant</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Plan</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {roles.map((r) => (
              <TableRow key={r.user_id + r.role}>
                <TableCell className="font-mono text-xs">{r.user_id}</TableCell>
                <TableCell><Badge variant={r.role === "admin" ? "default" : "secondary"}>{r.role}</Badge></TableCell>
                <TableCell>{plans.find((p) => p.user_id === r.user_id)?.plan ?? "free"}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => assign(r.user_id, r.role, true)}>Remove</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Moderation ({items.length})</h2>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((it) => (
            <div key={it.id} className="border rounded-lg overflow-hidden bg-card">
              {it.url && <img src={it.url} alt={it.title} className="aspect-square w-full object-cover bg-muted" loading="lazy" />}
              <div className="p-2 space-y-1">
                <p className="text-sm truncate">{it.title}</p>
                <p className="text-xs text-muted-foreground truncate font-mono">{it.user_id}</p>
                <div className="flex gap-1">
                  {it.is_public && <Button size="sm" variant="outline" onClick={() => unpublish(it)}>Unpublish</Button>}
                  <Button size="sm" variant="ghost" onClick={() => del(it)}>Delete</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
