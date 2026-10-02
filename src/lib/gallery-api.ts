// Typed client for the gallery + api-keys edge functions.
const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

let tokenGetter: () => Promise<string | null> = async () => null;
export const setTokenGetter = (fn: () => Promise<string | null>) => { tokenGetter = fn; };

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function call<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const token = await tokenGetter();
  const r = await fetch(`${BASE}/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON,
      Authorization: `Bearer ${token ?? ANON}`,
    },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(data.error ?? `Request failed (${r.status})`, r.status);
  return data as T;
}

export type Role = "admin" | "moderator" | "user";
export interface GalleryItem {
  id: string; user_id: string; title: string; description: string | null; tool: string | null;
  storage_path: string; width: number | null; height: number | null; bytes: number | null;
  tags: string[]; is_public: boolean; views: number; created_at: string; url: string | null;
}
export interface ShareLink {
  id: string; item_id: string; token: string; expires_at: string | null;
  max_views: number | null; views: number; revoked: boolean; created_at: string;
}
export interface ApiKeyRow {
  id: string; name: string | null; scopes: string[]; created_at: string;
  last_used_at: string | null; revoked: boolean;
}

const g = <T,>(action: string, rest: Record<string, unknown> = {}) => call<T>("gallery", { action, ...rest });

export const galleryApi = {
  listPublic: (search = "") => g<{ items: GalleryItem[] }>("listPublic", { search }),
  list: (scope: "mine" | "public" | "all", search = "") => g<{ items: GalleryItem[]; roles: Role[] }>("list", { scope, search }),
  upload: (p: { dataUrl: string; title?: string; description?: string; tool?: string; tags?: string[]; isPublic?: boolean; width?: number; height?: number }) =>
    g<{ item: GalleryItem }>("upload", p),
  update: (id: string, patch: { title?: string; description?: string; tags?: string[]; isPublic?: boolean }) =>
    g<{ item: GalleryItem }>("update", { id, ...patch }),
  remove: (id: string) => g<{ ok: true }>("remove", { id }),
  share: (itemId: string, opts: { expiresAt?: string | null; maxViews?: number | null } = {}) =>
    g<{ link: ShareLink }>("share", { itemId, ...opts }),
  listShares: (itemId: string) => g<{ links: ShareLink[] }>("listShares", { itemId }),
  revokeShare: (id: string) => g<{ ok: true }>("revokeShare", { id }),
  resolveShare: (token: string) => g<{ item: GalleryItem }>("resolveShare", { token }),
  myRoles: () => g<{ roles: Role[]; userId: string; provider: string }>("myRoles"),
  adminList: () => g<{ items: GalleryItem[]; plans: { user_id: string; plan: string }[]; roles: { user_id: string; role: Role }[] }>("adminList"),
  setRole: (userId: string, role: Role, revoke = false) => g<{ ok: true }>("setRole", { userId, role, revoke }),
};

export const apiKeysApi = {
  list: () => call<{ keys: ApiKeyRow[] }>("api-keys", { action: "list" }),
  create: (name: string, scopes: string[]) =>
    call<ApiKeyRow & { key: string }>("api-keys", { action: "create", name, scopes }),
  revoke: (id: string) => call<{ ok: true }>("api-keys", { action: "revoke", id }),
};

export const shareUrl = (token: string) => `${window.location.origin}/s/${token}`;
