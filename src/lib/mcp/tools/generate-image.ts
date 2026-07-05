import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callImageGeneration } from "../gateway";

export default defineTool({
  name: "generate_image",
  title: "Generate image",
  description: "Generate an image from a text prompt. Returns an image data URL.",
  inputSchema: {
    prompt: z.string().min(1).describe("Text description of the image to generate."),
    style: z
      .enum([
        "none",
        "photorealistic",
        "cinematic",
        "anime",
        "oil_painting",
        "watercolor",
        "3d_render",
        "pixel_art",
        "line_art",
        "minimalist",
      ])
      .optional()
      .describe("Optional artistic style."),
    aspect: z
      .enum(["1:1", "16:9", "9:16", "4:3", "3:4"])
      .optional()
      .describe("Optional aspect ratio."),
  },
  annotations: { readOnlyHint: false, openWorldHint: true },
  handler: async ({ prompt, style, aspect }) => {
    const { imageUrl, text } = await callImageGeneration({ prompt, style, aspect });
    if (imageUrl) {
      return {
        content: [
          { type: "text", text: text || "Image generated." },
          { type: "text", text: `Image data URL: ${imageUrl}` },
        ],
        structuredContent: { image_url: imageUrl },
      };
    }
    return {
      content: [{ type: "text", text: text || "No image generated." }],
      isError: true,
    };
  },
});
