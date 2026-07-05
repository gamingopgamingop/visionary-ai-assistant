import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callTextAction } from "../gateway";

export default defineTool({
  name: "analyze_image",
  title: "Analyze image",
  description: "Describe an image in detail: subject, colors, mood, composition, notable features.",
  inputSchema: {
    image_url: z.string().url().describe("Public URL of the image to analyze."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ image_url }) => {
    const text = await callTextAction("analyze", image_url);
    return { content: [{ type: "text", text }] };
  },
});
