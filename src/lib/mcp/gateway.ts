// Server-side helpers for calling Lovable AI Gateway from MCP tool handlers.
// Import-safe: reads env only when a handler invokes these functions.

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

function getApiKey(): string {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");
  return key;
}

const SYSTEM_PROMPTS: Record<string, string> = {
  analyze:
    "You are an expert image analyst. Describe the image in detail: subject matter, colors, mood, composition, and notable features. Be thorough but clear.",
  detect:
    "You are an object detection expert. List every distinct object you can identify in the image. Format as a numbered list with the object name and a brief note about its location/context in the image.",
  ocr: "You are an OCR specialist. Extract ALL text visible in this image. Preserve the original formatting as much as possible. If no text is found, say so.",
  compare:
    "You are an image comparison expert. Analyze both images and describe their similarities and differences in detail: subject, colors, composition, style, and any notable distinctions.",
  imageToPrompt:
    "You are a prompt engineer. Generate a single, highly-detailed text-to-image prompt that would recreate this image. Include subject, style, lighting, composition, color palette, mood, camera/lens details if applicable, and quality modifiers. Output ONLY the prompt itself, no preamble or explanation.",
};

export async function callTextAction(
  action: keyof typeof SYSTEM_PROMPTS,
  imageA: string,
  imageB?: string,
): Promise<string> {
  const apiKey = getApiKey();
  const content: any[] = [{ type: "text", text: SYSTEM_PROMPTS[action] }];
  if (imageA) content.push({ type: "image_url", image_url: { url: imageA } });
  if (imageB) content.push({ type: "image_url", image_url: { url: imageB } });

  const resp = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "user", content }],
    }),
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`AI gateway error ${resp.status}: ${t.slice(0, 200)}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "No result returned.";
}

const STYLE_MAP: Record<string, string> = {
  none: "",
  photorealistic: "photorealistic, ultra-detailed, sharp focus, natural lighting",
  cinematic: "cinematic lighting, film grain, dramatic composition, anamorphic look",
  anime: "anime style, vibrant colors, clean line art, cel shading",
  oil_painting: "oil painting on canvas, visible brush strokes, rich color palette",
  watercolor: "watercolor painting, soft edges, flowing pigments, paper texture",
  "3d_render": "3D render, octane render, physically-based materials, soft global illumination",
  pixel_art: "pixel art, 16-bit retro game style, limited palette",
  line_art: "clean line art, black ink on white background, no shading",
  minimalist: "minimalist composition, lots of negative space, simple geometric forms",
};

export async function callImageGeneration(opts: {
  prompt: string;
  style?: string;
  aspect?: string;
}): Promise<{ imageUrl?: string; text: string }> {
  const apiKey = getApiKey();
  const styleSuffix = opts.style ? STYLE_MAP[opts.style] || "" : "";
  const aspectSuffix = opts.aspect && opts.aspect !== "1:1" ? `Aspect ratio: ${opts.aspect}.` : "";
  const fullPrompt = [opts.prompt, styleSuffix, aspectSuffix].filter(Boolean).join(" — ");

  const resp = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: [{ type: "text", text: fullPrompt }] }],
      modalities: ["image", "text"],
    }),
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`AI gateway error ${resp.status}: ${t.slice(0, 200)}`);
  }
  const data = await resp.json();
  const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  const text = data.choices?.[0]?.message?.content || "";
  return { imageUrl, text };
}
