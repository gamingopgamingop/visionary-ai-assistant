import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callTextAction } from "../gateway";

export default defineTool({
  name: "compare_images",
  title: "Compare images",
  description: "Compare two images and describe their similarities and differences.",
  inputSchema: {
    image_url_a: z.string().url().describe("Public URL of the first image."),
    image_url_b: z.string().url().describe("Public URL of the second image."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ image_url_a, image_url_b }) => {
    const text = await callTextAction("compare", image_url_a, image_url_b);
    return { content: [{ type: "text", text }] };
  },
});
