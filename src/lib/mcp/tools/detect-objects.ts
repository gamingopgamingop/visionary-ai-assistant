import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callTextAction } from "../gateway";

export default defineTool({
  name: "detect_objects",
  title: "Detect objects",
  description: "List distinct objects identified in an image with their location/context.",
  inputSchema: {
    image_url: z.string().url().describe("Public URL of the image."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ image_url }) => {
    const text = await callTextAction("detect", image_url);
    return { content: [{ type: "text", text }] };
  },
});
