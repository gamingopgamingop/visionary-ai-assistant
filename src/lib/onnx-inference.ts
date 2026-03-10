/**
 * ONNX Runtime Web — client-side AI model inference via WebAssembly.
 *
 * This module provides infrastructure for running ONNX models in the browser.
 * To use a custom model:
 *   1. Place .onnx files in public/models/
 *   2. Call runInference() with the model path and input tensor
 *
 * Includes a built-in image classification helper using MobileNet v2.
 */

import * as ort from "onnxruntime-web";

// Configure ONNX Runtime to use WASM backend
ort.env.wasm.numThreads = 1;

let session: ort.InferenceSession | null = null;
let currentModelPath = "";

export async function loadModel(
  modelPath: string
): Promise<ort.InferenceSession> {
  if (session && currentModelPath === modelPath) return session;

  session?.release();
  session = await ort.InferenceSession.create(modelPath, {
    executionProviders: ["wasm"],
  });
  currentModelPath = modelPath;
  return session;
}

export async function runInference(
  modelPath: string,
  inputName: string,
  inputData: Float32Array,
  inputShape: number[]
): Promise<ort.Tensor> {
  const sess = await loadModel(modelPath);
  const tensor = new ort.Tensor("float32", inputData, inputShape);
  const results = await sess.run({ [inputName]: tensor });
  const outputName = Object.keys(results)[0];
  return results[outputName];
}

/**
 * Preprocess an image for MobileNet v2 (224×224, ImageNet normalization).
 */
export function preprocessImageForMobileNet(
  base64: string
): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 224;
      canvas.height = 224;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, 224, 224);
      const imageData = ctx.getImageData(0, 0, 224, 224);
      const { data } = imageData;

      // CHW format, ImageNet normalization
      const mean = [0.485, 0.456, 0.406];
      const std = [0.229, 0.224, 0.225];
      const float32 = new Float32Array(3 * 224 * 224);

      for (let c = 0; c < 3; c++) {
        for (let h = 0; h < 224; h++) {
          for (let w = 0; w < 224; w++) {
            const idx = (h * 224 + w) * 4 + c;
            float32[c * 224 * 224 + h * 224 + w] =
              (data[idx] / 255 - mean[c]) / std[c];
          }
        }
      }
      resolve(float32);
    };
    img.onerror = reject;
    img.src = base64;
  });
}

export async function classifyImage(
  base64: string,
  modelPath = "/models/mobilenetv2-7.onnx"
): Promise<{ label: string; score: number }[]> {
  const inputData = await preprocessImageForMobileNet(base64);
  const output = await runInference(modelPath, "input", inputData, [
    1, 3, 224, 224,
  ]);
  const scores = output.data as Float32Array;

  // Get top 5 indices
  const indexed = Array.from(scores).map((s, i) => ({ i, s }));
  indexed.sort((a, b) => b.s - a.s);
  const top5 = indexed.slice(0, 5);

  // Softmax for probabilities
  const maxScore = top5[0].s;
  const exps = top5.map((t) => Math.exp(t.s - maxScore));
  const sumExps = exps.reduce((a, b) => a + b, 0);

  return top5.map((t, idx) => ({
    label: `Class ${t.i}`,
    score: exps[idx] / sumExps,
  }));
}
