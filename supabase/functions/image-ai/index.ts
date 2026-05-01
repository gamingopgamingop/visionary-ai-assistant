import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { action, image1, image2, prompt } = await req.json();

    // Text-based analysis actions use gemini-3-flash-preview
    if (["analyze", "detect", "ocr", "compare", "imageToPrompt"].includes(action)) {
      return await handleTextAction(action, image1, image2, LOVABLE_API_KEY);
    }

    // Image generation/editing actions use gemini-2.5-flash-image
    if (["enhance", "inpaint", "style", "generate"].includes(action)) {
      return await handleImageAction(action, image1, prompt, LOVABLE_API_KEY);
    }

    return jsonResp({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("image-ai error:", e);
    return jsonResp({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

async function handleTextAction(action: string, image1: string, image2: string | null, apiKey: string) {
  const systemPrompts: Record<string, string> = {
    analyze:
      "You are an expert image analyst. Describe the image in detail: subject matter, colors, mood, composition, and notable features. Be thorough but clear.",
    detect:
      "You are an object detection expert. List every distinct object you can identify in the image. Format as a numbered list with the object name and a brief note about its location/context in the image.",
    ocr:
      "You are an OCR specialist. Extract ALL text visible in this image. Preserve the original formatting as much as possible. If no text is found, say so.",
    compare:
      "You are an image comparison expert. Analyze both images and describe their similarities and differences in detail: subject, colors, composition, style, and any notable distinctions.",
    imageToPrompt:
      "You are a prompt engineer. Generate a single, highly-detailed text-to-image prompt that would recreate this image. Include subject, style, lighting, composition, color palette, mood, camera/lens details if applicable, and quality modifiers. Output ONLY the prompt itself, no preamble or explanation.",
  };

  const userContent: any[] = [{ type: "text", text: systemPrompts[action] }];
  if (image1) userContent.push({ type: "image_url", image_url: { url: image1 } });
  if (image2) userContent.push({ type: "image_url", image_url: { url: image2 } });

  const resp = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!resp.ok) {
    const status = resp.status;
    if (status === 429) return jsonResp({ error: "Rate limit exceeded. Please wait and try again." }, 429);
    if (status === 402) return jsonResp({ error: "AI credits exhausted. Please add credits in Settings." }, 402);
    const t = await resp.text();
    console.error("Gateway error:", status, t);
    return jsonResp({ error: "AI processing failed" }, 500);
  }

  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content || "No result returned.";
  return jsonResp({ resultText: text });
}

async function handleImageAction(action: string, image1: string | null, prompt: string | null, apiKey: string) {
  const instructions: Record<string, string> = {
    enhance:
      "Enhance this image: increase sharpness, improve clarity, upscale quality, fix noise. Return the improved version of the same image.",
    inpaint: `Repair and inpaint this image. ${prompt || "Fix any damaged or missing areas."}`,
    style: `Apply this artistic style to the image: ${prompt || "oil painting style"}. Keep the subject the same but transform the visual style.`,
    generate: prompt || "Generate a beautiful landscape image",
  };

  const userContent: any[] = [{ type: "text", text: instructions[action] }];
  if (image1) userContent.push({ type: "image_url", image_url: { url: image1 } });

  const resp = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: userContent }],
      modalities: ["image", "text"],
    }),
  });

  if (!resp.ok) {
    const status = resp.status;
    if (status === 429) return jsonResp({ error: "Rate limit exceeded. Please wait and try again." }, 429);
    if (status === 402) return jsonResp({ error: "AI credits exhausted. Please add credits in Settings." }, 402);
    const t = await resp.text();
    console.error("Gateway error:", status, t);
    return jsonResp({ error: "AI image processing failed" }, 500);
  }

  const data = await resp.json();
  const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  const text = data.choices?.[0]?.message?.content || "";

  if (imageUrl) {
    return jsonResp({ resultImage: imageUrl, resultText: text });
  }
  return jsonResp({ resultText: text || "No image was generated. Try a different prompt." });
}

function jsonResp(body: Record<string, any>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
