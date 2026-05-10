/**
 * Favicon helpers — apply a favicon dynamically and persist user choice.
 */
const STORAGE_KEY = "ait_favicon";

export interface FaviconPreset {
  id: string;
  label: string;
  href: string;
}

export const FAVICON_PRESETS: FaviconPreset[] = [
  { id: "default", label: "Eye (default)", href: "/favicon.png" },
  { id: "sparkle", label: "Sparkle", href: "/favicons/sparkle.png" },
  { id: "lens", label: "Camera Lens", href: "/favicons/lens.png" },
  { id: "wand", label: "Magic Wand", href: "/favicons/wand.png" },
];

export function applyFavicon(href: string) {
  const heads = document.head;
  heads.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach((el) => el.remove());
  const link = document.createElement("link");
  link.rel = "icon";
  link.type = href.startsWith("data:") ? "image/png" : "image/png";
  link.href = href;
  heads.appendChild(link);
  const apple = document.createElement("link");
  apple.rel = "apple-touch-icon";
  apple.href = href;
  heads.appendChild(apple);
}

export function loadStoredFavicon() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v) applyFavicon(v);
  } catch {}
}

export function setStoredFavicon(href: string) {
  try { localStorage.setItem(STORAGE_KEY, href); } catch {}
  applyFavicon(href);
}

export function clearStoredFavicon() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  applyFavicon(FAVICON_PRESETS[0].href);
}
