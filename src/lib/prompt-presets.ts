/**
 * Curated prompt presets for the Generate / Style / Inpaint / Enhance tools.
 * Grouped by intent so the picker stays scannable.
 */

export interface PromptPreset {
  id: string;
  label: string;
  prompt: string;
  category: "Photography" | "Art" | "Design" | "Edit" | "Scene";
  appliesTo?: Array<"generate" | "style" | "inpaint" | "enhance">;
}

export const PROMPT_PRESETS: PromptPreset[] = [
  // Photography
  { id: "portrait-studio", category: "Photography", label: "Studio portrait", prompt: "Professional studio portrait, soft key light, neutral grey backdrop, 85mm lens, shallow depth of field" },
  { id: "golden-hour", category: "Photography", label: "Golden hour", prompt: "Warm golden hour lighting, long shadows, sun flare, cinematic color grading" },
  { id: "macro-product", category: "Photography", label: "Product macro", prompt: "Crisp macro product photo on white seamless background, soft shadow, even lighting, ultra sharp" },
  { id: "film-noir", category: "Photography", label: "Film noir", prompt: "Black and white film noir, high contrast, dramatic shadows, 35mm grain" },

  // Art
  { id: "studio-ghibli", category: "Art", label: "Ghibli-style", prompt: "Soft Studio Ghibli inspired illustration, gentle pastel palette, dreamy atmosphere" },
  { id: "oil-painting", category: "Art", label: "Classical oil", prompt: "Classical oil painting, visible brushstrokes, rich impasto, museum lighting" },
  { id: "watercolor", category: "Art", label: "Watercolor", prompt: "Loose watercolor wash, soft bleed, paper texture, minimal lines" },
  { id: "pixel-art-16", category: "Art", label: "16-bit pixel art", prompt: "16-bit pixel art, limited palette, crisp pixels, no anti-aliasing" },

  // Design
  { id: "minimal-flat", category: "Design", label: "Minimal flat", prompt: "Minimal flat vector design, generous whitespace, two-tone palette" },
  { id: "isometric", category: "Design", label: "Isometric 3D", prompt: "Clean isometric 3D illustration, soft shadows, pastel palette" },
  { id: "bauhaus", category: "Design", label: "Bauhaus", prompt: "Bauhaus inspired geometric composition, primary colors, bold shapes" },
  { id: "blueprint", category: "Design", label: "Blueprint", prompt: "Technical blueprint on dark blue paper, white linework, annotations" },

  // Edit (inpaint / enhance)
  { id: "remove-bg", category: "Edit", label: "Clean background", prompt: "Replace background with clean studio white, keep subject lighting consistent", appliesTo: ["inpaint"] },
  { id: "denoise", category: "Edit", label: "Denoise & sharpen", prompt: "Reduce noise, recover fine detail, gently sharpen edges, preserve natural texture", appliesTo: ["enhance"] },
  { id: "color-pop", category: "Edit", label: "Color pop", prompt: "Boost saturation tastefully, lift shadows, deepen blacks, modern Instagram look", appliesTo: ["enhance", "style"] },
  { id: "fix-skin", category: "Edit", label: "Subtle skin retouch", prompt: "Subtly even out skin tones, keep pores, no plastic look", appliesTo: ["enhance", "inpaint"] },

  // Scene
  { id: "cyberpunk-city", category: "Scene", label: "Cyberpunk city", prompt: "Neon-lit cyberpunk skyline at night, rain-slick streets, holographic signage" },
  { id: "fantasy-forest", category: "Scene", label: "Enchanted forest", prompt: "Mystical enchanted forest, volumetric god rays, glowing flora, magical particles" },
  { id: "mountain-vista", category: "Scene", label: "Mountain vista", prompt: "Vast mountain vista at dawn, layered peaks, mist in valleys, painterly atmosphere" },
  { id: "cafe-interior", category: "Scene", label: "Cozy café", prompt: "Cozy café interior, warm tungsten lighting, wooden surfaces, soft bokeh" },
];

export function presetsFor(tool: string): PromptPreset[] {
  return PROMPT_PRESETS.filter(
    (p) => !p.appliesTo || p.appliesTo.includes(tool as any),
  );
}
