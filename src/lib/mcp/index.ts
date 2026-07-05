import { defineMcp } from "@lovable.dev/mcp-js";
import analyzeImage from "./tools/analyze-image";
import detectObjects from "./tools/detect-objects";
import ocrImage from "./tools/ocr-image";
import imageToPrompt from "./tools/image-to-prompt";
import compareImages from "./tools/compare-images";
import generateImage from "./tools/generate-image";

export default defineMcp({
  name: "ai-image-toolkit-mcp",
  title: "AI Image Toolkit",
  version: "0.1.0",
  instructions:
    "Tools for the AI Image Toolkit. Use `analyze_image`, `detect_objects`, `ocr_image`, `image_to_prompt`, or `compare_images` to inspect images by URL. Use `generate_image` to create a new image from a text prompt.",
  tools: [analyzeImage, detectObjects, ocrImage, imageToPrompt, compareImages, generateImage],
});
