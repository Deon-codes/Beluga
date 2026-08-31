# Advanced model features

Five capabilities built on top of `model_a_unified_v2.pt`, beyond basic
detection: explainability, uncertainty scoring, edge deployment, federated
learning, and self-supervised pretraining. None of these change the model's
detection accuracy — each adds a different kind of value (trust, triage,
deployability, collaboration, or future data efficiency). See the table at
the bottom for what each one is actually useful for.

**A note on paths**: these scripts still use absolute paths pointing at
`/home/nial-rojan/SIH 2026/...` (the machine they were developed and
verified on). They're pushed here for reference and reuse, not as
drop-in-anywhere tools — expect to adjust the path constants at the top of
each file for a different machine.

## 1. Explainability — `gradcam_explain.py`

Real, class-targeted Grad-CAM: backprops the model's own highest-confidence
detection back to the network layer that actually produced it, and overlays
a heatmap showing where the model looked to make that specific call.

**Status**: fixed and verified. The original version used EigenCAM (a
gradient-free method, chosen to sidestep YOLO's non-standard output format)
and it was broken — checked across 4 sample images and the heatmap
consistently highlighted background clutter, never the actual object. Root
cause was the method itself: EigenCAM finds regions of highest activation
*variance*, and on sonar imagery the noisy background has more variance
than the (comparatively smooth) object. Replacing it with real gradient-based
Grad-CAM surfaced two more real bugs along the way: YOLOv8's Detect head
reads three separate per-scale feature layers (P3/P4/P5), and the original
code only hooked one of them, so most detections got an exact-zero gradient
silently; and Ultralytics loads inference checkpoints with
`requires_grad=False`, so no gradient graph existed at all until that was
re-enabled. Verified on 6 fresh samples after the fix: every heatmap lands
on the real object (a pipeline seam, a piece of debris), not on noise.

## 2. Uncertainty scoring — `mc_dropout_uncertainty.py`

Test-time augmentation (TTA) as a substitute for true MC-Dropout — this
checkpoint has zero `nn.Dropout` layers, so classic MC-Dropout isn't
available without a retrain. Instead, runs 20 forward passes per image
under small brightness/gamma/noise jitter (value-only, no flips or crops —
a flip would misalign YOLO's fixed anchor grid across passes), then reports
mean confidence ± standard deviation per detection.

**Status**: verified working, no bugs found. On a real test run it
correctly distinguished a confident, consistent detection (89.7% ± 0.2%)
from a genuinely borderline one (58.2% ± 7.4%, flagged HIGH uncertainty).

## 3. Edge deployment — `export_edge.py` + `verify_edge_export.py`

`export_edge.py` exports the model to ONNX (fp32), then produces a
dynamically-quantized INT8 version. `verify_edge_export.py` sanity-checks
that the quantized model still detects sensibly by comparing PyTorch vs.
ONNX-fp32 vs. ONNX-int8 outputs on the same sample images.

**Status**: verified working. Confirmed size reduction (44.8MB fp32 → 11.5MB
int8) and confirmed the two verification runs were deterministic and
reproducible (a one-off "NMS time limit exceeded" warning on the first run
did not reproduce on a second run — CUDA/model warm-up jitter, not a real
issue).

**Referenced by the team's own backend roadmap** (Phase 6, Task 6.1) as the
script expected to generate edge latency/size numbers for the SIH pitch —
this one has a concrete, already-planned use.

## 4. Federated learning — `fl_setup_clients.py` + `fl_fedavg.py`

Simulates federated learning across the model's 4 real, non-IID data
sources treated as separate "clients" (subpipe/watertank/klsg/mine) — a
genuinely realistic non-IID split, since each comes from a different
sensor/collection campaign, not an artificial random partition.
`fl_setup_clients.py` partitions the data; `fl_fedavg.py` runs N rounds of
local fine-tuning + FedAvg weight averaging, validating the global model
after each round.

**Status**: fixed and verified, but with an honest result caveat. Found and
fixed two real bugs: (1) all four client `data.yaml` files and this
script's own path constants still referenced the dataset's old location
before a folder move, so nothing would even load; (2) the `FastTrainer`
class's `final_eval()` override was supposed to skip a redundant validation
pass per client but didn't actually work — the real cause was
`BaseTrainer._do_train()` forcing validation on the final epoch regardless
of `val=False`, which `final_eval()` never touches. Fixed by overriding
`validate()` itself (confirmed via a fresh timed run: ~16 min → 209.8s for
the smallest client, zero crash). **Result caveat**: one full FedAvg round
was run for real and validated — precision/recall/mAP all came out
*slightly below* the centrally-trained baseline (0.789 vs. 0.832
precision). This is expected FedAvg behavior after a single round on
imbalanced clients, not a bug — it would need several more rounds to
possibly recover past the baseline, with no guarantee it does.

## 5. Self-supervised pretraining — `contrastive_pretrain.py`

SimCLR-style contrastive pretraining on the model's unlabeled training
image pool (labels ignored entirely) — learns a backbone from raw pattern
structure before any labels are involved, then verifies the pretrained
weights load cleanly into a fresh YOLOv8s backbone.

**Status**: verified working end-to-end. A real run (300 steps, batch 64)
showed genuine learning signal (loss 4.78 → 3.47, not flat or diverged) and
the backbone transfer-load check passed cleanly. **Not yet integrated**:
this produces a standalone pretrained backbone and proves the mechanism
works — it was never actually used to initialize a real training run of
`model_a_unified_v2.pt` (which was trained from standard COCO-pretrained
weights instead), so there's no verified accuracy benefit yet, only a
verified working mechanism.

## What each one is actually useful for

| Script | Helps with | Doesn't help with |
|---|---|---|
| Grad-CAM | Trusting/verifying a high-stakes detection before acting on it (e.g. before sending a diver to a "possible mine") | Detection accuracy |
| Uncertainty scoring | Triaging limited human review time toward the detections the model is least sure about | Detection accuracy |
| Edge export | Deployability — running onboard a drone/AUV with no cloud connection, per the brief's explicit ask | Detection accuracy (quantization can cost a little) |
| Federated learning | Multi-organization collaboration without sharing raw (possibly sensitive) sonar data | Beating the current model's accuracy — not yet, at least |
| Contrastive pretraining | Future data efficiency for hazard types with no labeled data (the brief's own "ghost nets" example) | The currently deployed model — not wired in yet |
