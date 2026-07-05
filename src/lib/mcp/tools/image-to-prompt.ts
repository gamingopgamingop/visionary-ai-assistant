import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callTextAction } from "../gateway";

export default defineTool({
  name: "image_to_prompt",
  title: "Image to prompt",
  description: "Generate a detailed text-to-image prompt that would recreate the given image.",
  inputSchema: {
    image_url: z.string().url().describe("Public URL of the image."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ image_url }) => {
    const text = await callTextAction("imageToPrompt", image_url);
    return { content: [{ type: "text", text }] };
  },
});
