import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Copy, KeyRound } from "lucide-react";
import { useCurrentUser } from "@/providers/AuthProvider";
import { apiKeysApi, type ApiKeyRow } from "@/lib/gallery-api";

const SCOPES = ["mcp", "gallery:read", "gallery:write", "ai"];
const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export default function ApiKeys() {
  const { isSignedIn, isLoading } = useCurrentUser();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["mcp", "gallery:read"]);
  const [fresh, setFresh] = useState<string | null>(null);

  const load = useCallback(() => apiKeysApi.list().then((r) => setKeys(r.keys)).catch((e) => toast.error(e.message)), []);
  useEffect(() => { if (isSignedIn) load(); }, [isSignedIn, load]);

  const create = async () => {
    try {
      const r = await apiKeysApi.create(name || "Untitled key", scopes);
      setFresh(r.key); setName(""); load();
    } catch (e) { toast.error((e as Error).message); }
  };
  const revoke = async (id: string) => {
    if (!confirm("Revoke this key? Connectors using it will stop working.")) return;
    try { await apiKeysApi.revoke(id); load(); } catch (e) { toast.error((e as Error).message); }
  };

  if (isLoading) return null;
  if (!isSignedIn) return <main className="container py-24 text-center text-muted-foreground">Sign in to manage API keys.</main>;

  const example = `curl -X POST ${FN_BASE}/gallery \\\n  -H "x-api-key: ${fresh ?? "aitk_..."}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"action":"list","scope":"mine"}'`;

  return (
    <main className="container py-8 max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">API keys</h1>
        <p className="text-muted-foreground text-sm">Let connectors, scripts and AI agents act on your account. Limited to 120 requests per minute per key.</p>
      </div>

      {fresh && (
        <Alert>
          <KeyRound className="h-4 w-4" />
          <AlertTitle>Copy your new key now — it won't be shown again</AlertTitle>
          <AlertDescription className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-muted px-2 py-1 text-xs">{fresh}</code>
            <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(fresh).then(() => toast.success("Copied"))}><Copy className="h-4 w-4 mr-1" />Copy</Button>
            <Button size="sm" variant="ghost" onClick={() => setFresh(null)}>Done</Button>
          </AlertDescription>
        </Alert>
      )}

      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="font-medium">Create a key</h2>
        <Input placeholder="Key name, e.g. Claude Desktop" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        <div className="flex flex-wrap gap-4">
          {SCOPES.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm">
              <Checkbox checked={scopes.includes(s)} onCheckedChange={(v) => setScopes((xs) => v ? [...xs, s] : xs.filter((x) => x !== s))} />{s}
            </label>
          ))}
        </div>
        <Button onClick={create}>Generate key</Button>
      </section>

      <Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Scopes</TableHead><TableHead>Created</TableHead><TableHead>Last used</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>
          {keys.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No keys yet.</TableCell></TableRow>}
          {keys.map((k) => (
            <TableRow key={k.id} className={k.revoked ? "opacity-50" : ""}>
              <TableCell>{k.name ?? "—"}</TableCell>
              <TableCell className="space-x-1">{k.scopes.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}</TableCell>
              <TableCell className="text-xs">{new Date(k.created_at).toLocaleDateString()}</TableCell>
              <TableCell className="text-xs">{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "Never"}</TableCell>
              <TableCell className="text-right">{k.revoked ? <Badge variant="outline">Revoked</Badge> : <Button size="sm" variant="ghost" onClick={() => revoke(k.id)}>Revoke</Button>}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <section className="space-y-2">
        <h2 className="font-medium">Use it</h2>
        <pre className="rounded-lg bg-muted p-4 text-xs overflow-auto">{example}</pre>
      </section>
    </main>
  );
}
