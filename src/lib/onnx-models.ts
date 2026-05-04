/**
 * Registry of bundled / suggested ONNX models.
 * Add entries here after dropping files in `public/models/`.
 */
export interface OnnxModelEntry {
  id: string;
  label: string;
  path: string; // URL or /models/x.onnx
  inputName: string;
  inputShape: number[]; // e.g. [1,3,224,224]
  task: "classification";
  note?: string;
}

export const ONNX_MODELS: OnnxModelEntry[] = [
  {
    id: "mobilenetv2",
    label: "MobileNet v2",
    path: "/models/mobilenetv2-7.onnx",
    inputName: "input",
    inputShape: [1, 3, 224, 224],
    task: "classification",
    note: "Default — 14MB, ImageNet 1000 classes",
  },
  {
    id: "squeezenet",
    label: "SqueezeNet 1.0",
    path: "/models/squeezenet1.0-12.onnx",
    inputName: "data_0",
    inputShape: [1, 3, 224, 224],
    task: "classification",
    note: "Tiny — 5MB, fastest",
  },
  {
    id: "resnet50",
    label: "ResNet-50 v2",
    path: "/models/resnet50-v2-7.onnx",
    inputName: "data",
    inputShape: [1, 3, 224, 224],
    task: "classification",
    note: "Higher accuracy — 100MB",
  },
];
