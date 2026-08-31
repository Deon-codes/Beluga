"""Sanity-check the exported ONNX models still detect objects sensibly vs. the original PyTorch model."""
import glob
import random

import cv2
import numpy as np
import onnxruntime as ort
from ultralytics import YOLO

BEST_PT = "/home/nial-rojan/SIH 2026/sonar-debris/runs/detect/model_a_unified_v2/weights/best.pt"
FP32_ONNX = "/home/nial-rojan/SIH 2026/sonar-debris/runs/detect/model_a_unified_v2/edge/model_fp32.onnx"
INT8_ONNX = "/home/nial-rojan/SIH 2026/sonar-debris/runs/detect/model_a_unified_v2/edge/model_int8.onnx"

random.seed(0)
val_images = glob.glob("/home/nial-rojan/SIH 2026/sonar-debris/model_a_unified/val/images/*")
sample = random.sample(val_images, 5)


def preprocess(path, size=640):
    img = cv2.imread(path)
    img = cv2.resize(img, (size, size))
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = img.astype(np.float32) / 255.0
    img = np.transpose(img, (2, 0, 1))[None]
    return img


def onnx_detections(session, img, conf_thres=0.25):
    out = session.run(None, {session.get_inputs()[0].name: img})[0]  # (1, 21, 8400)
    preds = out[0].T  # (8400, 21) -> [x,y,w,h, 17 class scores]
    class_scores = preds[:, 4:]
    max_conf = class_scores.max(axis=1)
    return int((max_conf > conf_thres).sum()), float(max_conf.max())


print("Loading PyTorch model for reference...")
pt_model = YOLO(BEST_PT)

sess_fp32 = ort.InferenceSession(FP32_ONNX, providers=["CPUExecutionProvider"])
sess_int8 = ort.InferenceSession(INT8_ONNX, providers=["CPUExecutionProvider"])

print(f"\n{'image':40s} {'pt_dets':>8s} {'onnx32_dets':>12s} {'onnx8_dets':>11s} {'onnx8_maxconf':>14s}")
for path in sample:
    pt_res = pt_model.predict(path, conf=0.25, verbose=False)[0]
    pt_dets = len(pt_res.boxes)

    img = preprocess(path)
    n32, _ = onnx_detections(sess_fp32, img)
    n8, maxconf8 = onnx_detections(sess_int8, img)

    name = path.split("/")[-1]
    print(f"{name:40s} {pt_dets:8d} {n32:12d} {n8:11d} {maxconf8:14.3f}")
