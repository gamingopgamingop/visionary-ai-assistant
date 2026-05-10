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
  {
    id: "resnet18",
    label: "ResNet-18 v1",
    path: "https://github.com/onnx/models/raw/main/validated/vision/classification/resnet/model/resnet18-v1-7.onnx",
    inputName: "data",
    inputShape: [1, 3, 224, 224],
    task: "classification",
    note: "45MB — balanced speed/accuracy",
  },
  {
    id: "efficientnet-lite4",
    label: "EfficientNet-Lite4",
    path: "https://github.com/onnx/models/raw/main/validated/vision/classification/efficientnet-lite4/model/efficientnet-lite4-11.onnx",
    inputName: "images:0",
    inputShape: [1, 224, 224, 3],
    task: "classification",
    note: "49MB — strong mobile-tier accuracy",
  },
  {
    id: "googlenet",
    label: "GoogLeNet",
    path: "https://github.com/onnx/models/raw/main/validated/vision/classification/inception_and_googlenet/googlenet/model/googlenet-12.onnx",
    inputName: "data_0",
    inputShape: [1, 3, 224, 224],
    task: "classification",
    note: "27MB — classic Inception",
  },
  {
    id: "shufflenet-v2",
    label: "ShuffleNet v2",
    path: "https://github.com/onnx/models/raw/main/validated/vision/classification/shufflenet/model/shufflenet-v2-12.onnx",
    inputName: "input",
    inputShape: [1, 3, 224, 224],
    task: "classification",
    note: "9MB — efficient mobile model",
  },
  {
    id: "densenet121",
    label: "DenseNet-121",
    path: "https://github.com/onnx/models/raw/main/validated/vision/classification/densenet-121/model/densenet-12.onnx",
    inputName: "data_0",
    inputShape: [1, 3, 224, 224],
    task: "classification",
    note: "32MB — dense connectivity",
  },
  {
    id: "vgg16",
    label: "VGG-16",
    path: "https://github.com/onnx/models/raw/main/validated/vision/classification/vgg/model/vgg16-12.onnx",
    inputName: "data",
    inputShape: [1, 3, 224, 224],
    task: "classification",
    note: "528MB — heavy, classic CNN",
  },
  {
    id: "alexnet",
    label: "AlexNet (BVLC)",
    path: "https://github.com/onnx/models/raw/main/validated/vision/classification/alexnet/model/bvlcalexnet-12.onnx",
    inputName: "data_0",
    inputShape: [1, 3, 224, 224],
    task: "classification",
    note: "240MB — historic baseline",
  },
];
