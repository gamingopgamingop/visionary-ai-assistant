import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callTextAction } from "../gateway";

export default defineTool({
  name: "ocr_image",
  title: "OCR image",
  description: "Extract all visible text from an image, preserving formatting where possible.",
  inputSchema: {
    image_url: z.string().url().describe("Public URL of the image."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ image_url }) => {
    const text = await callTextAction("ocr", image_url);
    return { content: [{ type: "text", text }] };
  },
});
