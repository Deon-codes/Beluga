"""Export model_a_unified_v2 to ONNX and produce an INT8-quantized version for edge deployment."""
import os
import shutil
from pathlib import Path

from ultralytics import YOLO
from onnxruntime.quantization import quantize_dynamic, QuantType

BEST_PT = "/home/nial-rojan/SIH 2026/sonar-debris/runs/detect/model_a_unified_v2/weights/best.pt"
EDGE_DIR = Path("/home/nial-rojan/SIH 2026/sonar-debris/runs/detect/model_a_unified_v2/edge")


def export_edge(best_pt=BEST_PT, edge_dir=EDGE_DIR, imgsz=640, verbose=True):
    """Export best_pt to ONNX fp32 then INT8-quantize it into edge_dir.
    Returns (fp32_path, int8_path)."""
    edge_dir = Path(edge_dir)
    edge_dir.mkdir(parents=True, exist_ok=True)

    if verbose:
        print("Loading model...")
    model = YOLO(best_pt)

    if verbose:
        print("Exporting to ONNX (fp32)...")
    onnx_path = Path(model.export(format="onnx", imgsz=imgsz, simplify=True, opset=17))

    fp32_target = edge_dir / "model_fp32.onnx"
    # shutil.move, not Path.rename: rename() is os.rename() under the hood,
    # which raises "Invalid cross-device link" when onnx_path (next to
    # best_pt) and edge_dir live on different filesystems/devices --
    # confirmed empirically when edge_dir pointed at a pytest tmp_path.
    shutil.move(str(onnx_path), str(fp32_target))
    fp32_size = fp32_target.stat().st_size / (1024 * 1024)
    if verbose:
        print(f"FP32 ONNX saved: {fp32_target} ({fp32_size:.2f} MB)")

    if verbose:
        print("Quantizing to INT8 (dynamic, weight-only)...")
    int8_target = edge_dir / "model_int8.onnx"
    quantize_dynamic(
        model_input=str(fp32_target),
        model_output=str(int8_target),
        weight_type=QuantType.QInt8,
    )
    int8_size = int8_target.stat().st_size / (1024 * 1024)
    if verbose:
        print(f"INT8 ONNX saved: {int8_target} ({int8_size:.2f} MB)")
        print(f"\nSize reduction: {fp32_size:.2f} MB -> {int8_size:.2f} MB "
              f"({(1 - int8_size / fp32_size) * 100:.1f}% smaller)")

    return fp32_target, int8_target


if __name__ == "__main__":
    export_edge()
