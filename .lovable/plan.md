# Rollout plan

You said "all four" — that's ~3 sprints of work. I'll ship one batch per turn so each lands reviewable and working, instead of a single mega-commit that breaks the build. Confirm or reorder and I'll start.

## Batch 1 — More editing tools (this turn, if approved)
Pure client-side, extends `src/lib/image-tools.ts` and adds tabs to `Workspace.tsx`. No backend.
- **Crop / Rotate / Flip** — drag-handle crop, rotation slider, flip H/V
- **Resize** — pixel or % with aspect lock
- **Text Overlay** — font, size, color, position, opacity
- **Draw** — freehand brush canvas layer with eraser
- **Masking helper** — rectangle/brush mask to scope Redact/Inpaint
- **Stitch** — horizontal/vertical concat of 2–5 images
- **Diff** — pixel-diff heatmap between two images
- **Fingerprint** — pHash + similarity vs a comparison image
- **Metadata / EXIF strip** — view + strip via canvas re-encode

## Batch 2 — More AI tabs
Transformers.js, no new infra.
- **Segment** (SAM-style) · **Classify** (ViT) · **Colorize** · **Upscale AI**
- Each gated by quota hook (added in Batch 3)

## Batch 3 — Navbar + Pricing + Quotas + Stripe
- Extract `src/components/Navbar.tsx` (sticky, glass, mobile sheet, Clerk-aware)
- `/pricing` page with monthly/yearly toggle, 3 tiers
- Supabase tables: `user_plans`, `usage_tracking` (with RLS + grants)
- `useQuota` + `QuotaBar` + `UpgradeModal`
- Edge functions: `create-checkout`, `stripe-webhook`
- Requires Stripe secret key from you

## Batch 4 — Fallback auth (Auth0 → Logto → FusionAuth → Supabase email)
- `AuthProvider` with timeout detection on Clerk
- `useCurrentUser` returns unified shape regardless of provider
- `FallbackAuthModal` with social grids per provider
- `/callback` route, password reset page
- Requires env vars + app IDs from each provider you want enabled

---

Reply with **"go"** to start Batch 1, or reorder (e.g. "navbar first") and I'll start there.