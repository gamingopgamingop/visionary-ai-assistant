import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  admin, clientIp, corsHeaders, getIdentity, getRoles, isAdmin, isModerator, json, rateLimit,
} from "../_shared/identity.ts";

const BUCKET = "gallery";
const SIGNED_TTL = 60 * 60; // 1 hour

const LIMITS: Record<string, { limit: number; window: number }> = {
  upload: { limit: 30, window: 3600 },
  list: { limit: 120, window: 60 },
  update: { limit: 60, window: 60 },
  remove: { limit: 60, window: 60 },
  share: { limit: 30, window: 3600 },
  resolveShare: { limit: 60, window: 60 },
  listShares: { limit: 60, window: 60 },
  revokeShare: { limit: 60, window: 60 },
  adminList: { limit: 60, window: 60 },
  setRole: { limit: 30, window: 3600 },
  myRoles: { limit: 120, window: 60 },
};

async function sign(path: string): Promise<string | null> {
  const { data } = await admin().storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
  return data?.signedUrl ?? null;
}

async function withUrls<T extends { storage_path: string }>(rows: T[]) {
  return Promise.all(rows.map(async (r) => ({ ...r, url: await sign(r.storage_path) })));
}

function token() {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    if (!action) return json({ error: "Missing action" }, 400);

    const identity = await getIdentity(req);
    const subject = identity ? `user:${identity.userId}` : `ip:${clientIp(req)}`;
    const cfg = LIMITS[action] ?? { limit: 60, window: 60 };
    const rl = await rateLimit(subject, action, identity ? cfg.limit : Math.ceil(cfg.limit / 4), cfg.window);
    if (!rl.allowed) {
      return json({ error: "Rate limit exceeded. Try again later.", resetAt: rl.resetAt }, 429);
    }

    const db = admin();

    // ---------- public / unauthenticated actions ----------
    if (action === "listPublic") {
      const { search = "", limit = 48, offset = 0 } = body;
      let q = db.from("gallery_items").select("*").eq("is_public", true)
        .order("created_at", { ascending: false }).range(offset, offset + limit - 1);
      if (search) q = q.ilike("title", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return json({ items: await withUrls(data ?? []) });
    }

    if (action === "resolveShare") {
      const t = String(body.token ?? "");
      const { data: link } = await db.from("share_links").select("*").eq("token", t).maybeSingle();
      if (!link || link.revoked) return json({ error: "Link not found or revoked" }, 404);
      if (link.expires_at && new Date(link.expires_at) < new Date()) return json({ error: "Link expired" }, 410);
      if (link.max_views != null && link.views >= link.max_views) return json({ error: "Link view limit reached" }, 410);

      const { data: item } = await db.from("gallery_items").select("*").eq("id", link.item_id).maybeSingle();
      if (!item) return json({ error: "Item not found" }, 404);

      await db.from("share_links").update({ views: link.views + 1 }).eq("id", link.id);
      await db.from("gallery_items").update({ views: item.views + 1 }).eq("id", item.id);
      return json({ item: { ...item, url: await sign(item.storage_path) } });
    }

    // ---------- authenticated actions ----------
    if (!identity) return json({ error: "Authentication required" }, 401);
    const roles = await getRoles(identity.userId);

    if (action === "myRoles") return json({ roles, userId: identity.userId, provider: identity.provider });

    if (action === "upload") {
      const { dataUrl, title = "Untitled", description = null, tool = null, tags = [], isPublic = false, width, height } = body;
      if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
        return json({ error: "dataUrl must be a data:image/* URI" }, 400);
      }
      const [meta, b64] = dataUrl.split(",");
      const mime = meta.slice(5, meta.indexOf(";"));
      const ext = (mime.split("/")[1] ?? "png").replace("jpeg", "jpg");
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      if (bytes.byteLength > 12 * 1024 * 1024) return json({ error: "Image exceeds 12 MB" }, 413);

      const path = `${identity.userId}/${crypto.randomUUID()}.${ext}`;
      const up = await db.storage.from(BUCKET).upload(path, bytes, { contentType: mime, upsert: false });
      if (up.error) throw up.error;

      const { data, error } = await db.from("gallery_items").insert({
        user_id: identity.userId,
        title: String(title).slice(0, 200),
        description: description ? String(description).slice(0, 2000) : null,
        tool,
        storage_path: path,
        width: width ?? null,
        height: height ?? null,
        bytes: bytes.byteLength,
        tags: Array.isArray(tags) ? tags.slice(0, 20).map(String) : [],
        is_public: !!isPublic,
      }).select().single();
      if (error) throw error;
      return json({ item: { ...data, url: await sign(path) } });
    }

    if (action === "list") {
      const { scope = "mine", search = "", limit = 48, offset = 0 } = body;
      let q = db.from("gallery_items").select("*")
        .order("created_at", { ascending: false }).range(offset, offset + limit - 1);
      if (scope === "mine") q = q.eq("user_id", identity.userId);
      else if (scope === "all") {
        if (!isModerator(roles)) return json({ error: "Forbidden" }, 403);
      } else q = q.eq("is_public", true);
      if (search) q = q.ilike("title", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return json({ items: await withUrls(data ?? []), roles });
    }

    if (action === "update" || action === "remove") {
      const { data: item } = await db.from("gallery_items").select("*").eq("id", body.id).maybeSingle();
      if (!item) return json({ error: "Not found" }, 404);
      const owner = item.user_id === identity.userId;
      if (!owner && !isModerator(roles)) return json({ error: "Forbidden" }, 403);

      if (action === "remove") {
        if (!owner && !isAdmin(roles)) return json({ error: "Only owners or admins can delete" }, 403);
        await db.storage.from(BUCKET).remove([item.storage_path]);
        await db.from("gallery_items").delete().eq("id", item.id);
        return json({ ok: true });
      }

      const patch: Record<string, unknown> = {};
      if (body.title !== undefined) patch.title = String(body.title).slice(0, 200);
      if (body.description !== undefined) patch.description = body.description;
      if (body.tags !== undefined) patch.tags = (body.tags as string[]).slice(0, 20);
      if (body.isPublic !== undefined) patch.is_public = !!body.isPublic;
      // moderators may only unpublish, not publish someone else's item
      if (!owner && patch.is_public === true) return json({ error: "Forbidden" }, 403);
      const { data, error } = await db.from("gallery_items").update(patch).eq("id", item.id).select().single();
      if (error) throw error;
      return json({ item: { ...data, url: await sign(data.storage_path) } });
    }

    if (action === "share") {
      const { data: item } = await db.from("gallery_items").select("*").eq("id", body.itemId).maybeSingle();
      if (!item) return json({ error: "Not found" }, 404);
      if (item.user_id !== identity.userId && !isAdmin(roles)) return json({ error: "Forbidden" }, 403);
      const { data, error } = await db.from("share_links").insert({
        item_id: item.id,
        user_id: identity.userId,
        token: token(),
        expires_at: body.expiresAt ?? null,
        max_views: body.maxViews ?? null,
      }).select().single();
      if (error) throw error;
      return json({ link: data });
    }

    if (action === "listShares") {
      const { data, error } = await db.from("share_links").select("*")
        .eq("item_id", body.itemId).eq("user_id", identity.userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json({ links: data ?? [] });
    }

    if (action === "revokeShare") {
      const { data: link } = await db.from("share_links").select("*").eq("id", body.id).maybeSingle();
      if (!link) return json({ error: "Not found" }, 404);
      if (link.user_id !== identity.userId && !isAdmin(roles)) return json({ error: "Forbidden" }, 403);
      await db.from("share_links").update({ revoked: true }).eq("id", link.id);
      return json({ ok: true });
    }

    // ---------- admin ----------
    if (action === "adminList") {
      if (!isAdmin(roles)) return json({ error: "Forbidden" }, 403);
      const [items, plans, rolesRows] = await Promise.all([
        db.from("gallery_items").select("*").order("created_at", { ascending: false }).limit(200),
        db.from("user_plans").select("*").limit(200),
        db.from("user_roles").select("*").limit(500),
      ]);
      return json({
        items: await withUrls(items.data ?? []),
        plans: plans.data ?? [],
        roles: rolesRows.data ?? [],
      });
    }

    if (action === "setRole") {
      if (!isAdmin(roles)) return json({ error: "Forbidden" }, 403);
      const target = String(body.userId ?? "");
      const role = String(body.role ?? "");
      if (!target || !["admin", "moderator", "user"].includes(role)) {
        return json({ error: "Invalid userId or role" }, 400);
      }
      if (body.revoke) {
        await db.from("user_roles").delete().eq("user_id", target).eq("role", role);
      } else {
        await db.from("user_roles").upsert({ user_id: target, role }, { onConflict: "user_id,role" });
      }
      return json({ ok: true });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    console.error("gallery error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
