"""Export model_a_unified_v2 to ONNX and produce an INT8-quantized version for edge deployment."""
import os
from pathlib import Path

from ultralytics import YOLO
from onnxruntime.quantization import quantize_dynamic, QuantType

BEST_PT = "/home/nial-rojan/SIH 2026/sonar-debris/runs/detect/model_a_unified_v2/weights/best.pt"
EDGE_DIR = Path("/home/nial-rojan/SIH 2026/sonar-debris/runs/detect/model_a_unified_v2/edge")
EDGE_DIR.mkdir(parents=True, exist_ok=True)

print("Loading model...")
model = YOLO(BEST_PT)

print("Exporting to ONNX (fp32)...")
onnx_path = model.export(format="onnx", imgsz=640, simplify=True, opset=17)
onnx_path = Path(onnx_path)

fp32_target = EDGE_DIR / "model_fp32.onnx"
onnx_path.rename(fp32_target)
fp32_size = fp32_target.stat().st_size / (1024 * 1024)
print(f"FP32 ONNX saved: {fp32_target} ({fp32_size:.2f} MB)")

print("Quantizing to INT8 (dynamic, weight-only)...")
int8_target = EDGE_DIR / "model_int8.onnx"
quantize_dynamic(
    model_input=str(fp32_target),
    model_output=str(int8_target),
    weight_type=QuantType.QInt8,
)
int8_size = int8_target.stat().st_size / (1024 * 1024)
print(f"INT8 ONNX saved: {int8_target} ({int8_size:.2f} MB)")

print(f"\nSize reduction: {fp32_size:.2f} MB -> {int8_size:.2f} MB "
      f"({(1 - int8_size / fp32_size) * 100:.1f}% smaller)")
