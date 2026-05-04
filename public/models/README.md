# ONNX Models

Drop `.onnx` model files in this directory. They will be served at `/models/<filename>.onnx`.

Suggested models:

- **mobilenetv2-7.onnx** — Image classification (ImageNet 1000 classes)
  https://github.com/onnx/models/raw/main/validated/vision/classification/mobilenet/model/mobilenetv2-7.onnx

- **squeezenet1.0-12.onnx** — Lightweight classification
  https://github.com/onnx/models/raw/main/validated/vision/classification/squeezenet/model/squeezenet1.0-12.onnx

- **resnet50-v2-7.onnx** — Higher-accuracy classification
  https://github.com/onnx/models/raw/main/validated/vision/classification/resnet/model/resnet50-v2-7.onnx

After placing a file here, select it from the ONNX AI tab, or paste a URL / upload a `.onnx` file at runtime.
