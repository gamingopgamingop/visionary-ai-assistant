import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Link2, Trash2, Upload, Eye, Lock, Globe } from "lucide-react";
import { useCurrentUser } from "@/providers/AuthProvider";
import { galleryApi, shareUrl, type GalleryItem, type ShareLink, type Role } from "@/lib/gallery-api";

type Scope = "public" | "mine" | "all";

export default function Gallery() {
  const { isSignedIn } = useCurrentUser();
  const [scope, setScope] = useState<Scope>("public");
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [shareFor, setShareFor] = useState<GalleryItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (scope === "public" || !isSignedIn) {
        setItems((await galleryApi.listPublic(search)).items);
      } else {
        const r = await galleryApi.list(scope, search);
        setItems(r.items); setRoles(r.roles);
      }
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }, [scope, search, isSignedIn]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (isSignedIn) galleryApi.myRoles().then((r) => setRoles(r.roles)).catch(() => {}); }, [isSignedIn]);

  const onUpload = async (file: File) => {
    const dataUrl = await new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.readAsDataURL(file); });
    try {
      await galleryApi.upload({ dataUrl, title: file.name.replace(/\.[^.]+$/, "") });
      toast.success("Uploaded (private)"); setScope("mine"); load();
    } catch (e) { toast.error((e as Error).message); }
  };

  const toggle = async (it: GalleryItem) => {
    try {
      const { item } = await galleryApi.update(it.id, { isPublic: !it.is_public });
      setItems((xs) => xs.map((x) => (x.id === it.id ? item : x)));
    } catch (e) { toast.error((e as Error).message); }
  };

  const remove = async (it: GalleryItem) => {
    if (!confirm(`Delete "${it.title}"?`)) return;
    try { await galleryApi.remove(it.id); setItems((xs) => xs.filter((x) => x.id !== it.id)); }
    catch (e) { toast.error((e as Error).message); }
  };

  const isMod = roles.includes("admin") || roles.includes("moderator");

  return (
    <main className="container py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Gallery</h1>
          <p className="text-muted-foreground text-sm">Public showcase, your private library, and private share links.</p>
        </div>
        {isSignedIn && (
          <label className="inline-flex">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
            <Button asChild><span><Upload className="h-4 w-4 mr-2" />Upload</span></Button>
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={scope} onValueChange={(v) => setScope(v as Scope)}>
          <TabsList>
            <TabsTrigger value="public">Public</TabsTrigger>
            <TabsTrigger value="mine" disabled={!isSignedIn}>Mine</TabsTrigger>
            {isMod && <TabsTrigger value="all">All (moderation)</TabsTrigger>}
          </TabsList>
        </Tabs>
        <Input placeholder="Search titles…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        {!isSignedIn && <span className="text-sm text-muted-foreground">Sign in to upload and keep a private library.</span>}
      </div>

      {loading ? <p className="text-muted-foreground">Loading…</p> : items.length === 0 ? (
        <p className="text-muted-foreground py-16 text-center">Nothing here yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((it) => {
            const editable = scope !== "public";
            return (
              <article key={it.id} className="rounded-lg border bg-card overflow-hidden">
                {it.url && <img src={it.url} alt={it.title} className="w-full aspect-square object-cover bg-muted" loading="lazy" />}
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium truncate">{it.title}</h3>
                    <Badge variant="secondary" className="shrink-0">
                      {it.is_public ? <Globe className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                      {it.is_public ? "Public" : "Private"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground"><Eye className="h-3 w-3" />{it.views}</div>
                  {editable && (
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 text-sm">
                        <Switch checked={it.is_public} onCheckedChange={() => toggle(it)} />Public
                      </label>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" aria-label="Share" onClick={() => setShareFor(it)}><Link2 className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => remove(it)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ShareDialog item={shareFor} onClose={() => setShareFor(null)} />
    </main>
  );
}

function ShareDialog({ item, onClose }: { item: GalleryItem | null; onClose: () => void }) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [hours, setHours] = useState("");
  const [maxViews, setMaxViews] = useState("");

  useEffect(() => {
    if (item) galleryApi.listShares(item.id).then((r) => setLinks(r.links)).catch((e) => toast.error(e.message));
  }, [item]);

  if (!item) return null;

  const create = async () => {
    try {
      const { link } = await galleryApi.share(item.id, {
        expiresAt: hours ? new Date(Date.now() + Number(hours) * 3600_000).toISOString() : null,
        maxViews: maxViews ? Number(maxViews) : null,
      });
      setLinks((l) => [link, ...l]);
      await navigator.clipboard.writeText(shareUrl(link.token)).catch(() => {});
      toast.success("Link created and copied");
    } catch (e) { toast.error((e as Error).message); }
  };

  const revoke = async (id: string) => {
    try { await galleryApi.revokeShare(id); setLinks((l) => l.map((x) => (x.id === id ? { ...x, revoked: true } : x))); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Share "{item.title}"</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Anyone with the link can view this image, even while it's private.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Expires in (hours)</Label><Input type="number" min={1} placeholder="Never" value={hours} onChange={(e) => setHours(e.target.value)} /></div>
          <div className="space-y-1"><Label>Max views</Label><Input type="number" min={1} placeholder="Unlimited" value={maxViews} onChange={(e) => setMaxViews(e.target.value)} /></div>
        </div>
        <Button onClick={create}>Create link</Button>
        <div className="space-y-2 max-h-60 overflow-auto">
          {links.map((l) => (
            <div key={l.id} className="flex items-center gap-2 text-sm border rounded p-2">
              <span className={`flex-1 truncate font-mono text-xs ${l.revoked ? "line-through text-muted-foreground" : ""}`}>{shareUrl(l.token)}</span>
              <span className="text-xs text-muted-foreground">{l.views}{l.max_views ? `/${l.max_views}` : ""} views</span>
              {!l.revoked && <>
                <Button size="icon" variant="ghost" aria-label="Copy" onClick={() => navigator.clipboard.writeText(shareUrl(l.token)).then(() => toast.success("Copied"))}><Copy className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => revoke(l.id)}>Revoke</Button>
              </>}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
