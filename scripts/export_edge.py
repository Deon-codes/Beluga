import argparse
import os
import time
from pathlib import Path

from ultralytics import YOLO

def get_file_size_mb(path):
    if not os.path.exists(path):
        return 0.0
    return os.path.getsize(path) / (1024 * 1024)

def benchmark_inference(model_path, imgsz=640, runs=10):
    try:
        model = YOLO(model_path)
        # Warmup
        for _ in range(3):
            model.predict(source="https://ultralytics.com/images/bus.jpg", imgsz=imgsz, verbose=False)
        
        # Benchmark
        start_time = time.time()
        for _ in range(runs):
            model.predict(source="https://ultralytics.com/images/bus.jpg", imgsz=imgsz, verbose=False)
        end_time = time.time()
        
        avg_latency = (end_time - start_time) / runs * 1000  # ms
        return avg_latency
    except Exception as e:
        print(f"Error benchmarking {model_path}: {e}")
        return float('inf')

def main():
    parser = argparse.ArgumentParser(description="Export YOLO model to ONNX INT8 and generate metrics for SIH Demo")
    parser.add_argument("--model", type=str, default="models/model_a_unified_v2.pt", help="Path to original FP32 PyTorch model")
    args = parser.parse_args()

    model_path = Path(args.model)
    if not model_path.exists():
        print(f"Model file not found: {model_path}")
        return

    print(f"Loading base model: {model_path}")
    model = YOLO(str(model_path))

    # Base Metrics
    base_size = get_file_size_mb(str(model_path))
    print(f"Base model (FP32) size: {base_size:.2f} MB")
    
    print("Benchmarking Base FP32 Model...")
    base_latency = benchmark_inference(str(model_path))
    print(f"Base model latency: {base_latency:.2f} ms per image")

    # Export to ONNX INT8
    print("\nExporting model to ONNX INT8...")
    try:
        exported_path = model.export(format="onnx", int8=True, simplify=True)
        print(f"Model exported to: {exported_path}")
    except Exception as e:
        print(f"Export failed: {e}")
        return
        
    onnx_model_path = str(model_path).replace(".pt", ".onnx")
    if not os.path.exists(onnx_model_path) and exported_path:
        onnx_model_path = exported_path

    # Exported Metrics
    onnx_size = get_file_size_mb(onnx_model_path)
    print(f"\nONNX INT8 model size: {onnx_size:.2f} MB")
    
    size_reduction = (1 - onnx_size / base_size) * 100 if base_size else 0
    print(f"Size reduction: {size_reduction:.1f}%")

    print("Benchmarking ONNX INT8 Model...")
    onnx_latency = benchmark_inference(onnx_model_path)
    print(f"ONNX INT8 model latency: {onnx_latency:.2f} ms per image")
    
    latency_improvement = (1 - onnx_latency / base_latency) * 100 if base_latency else 0
    print(f"Latency improvement: {latency_improvement:.1f}%")

    print("\n=== EDGE OPTIMIZATION PROFILING RESULTS (For SIH Presentation) ===")
    print(f"1. Model Compression: {base_size:.2f} MB (FP32) -> {onnx_size:.2f} MB (INT8) | {size_reduction:.1f}% reduction")
    print(f"2. Edge Latency (CPU): {base_latency:.2f} ms (FP32) -> {onnx_latency:.2f} ms (INT8) | {latency_improvement:.1f}% speedup")
    print("===================================================================")

if __name__ == "__main__":
    main()
