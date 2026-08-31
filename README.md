# Sonar Underwater Debris Detection

An end-to-end pipeline for detecting man-made objects (pipelines, shipwrecks,
naval mines, marine debris) in sonar imagery, built for SIH 2026.

## Repo layout

```
models/       trained checkpoint + its own usage README
notebooks/    the actual data pipeline + training code
scripts/      inference, visualization, and reporting tooling
```

## The Model A pipeline

`model_a_unified_v2.pt` is a YOLOv8s object detector trained on four merged
real sonar datasets, covering 17 classes. The full pipeline:

### 1. Data sources (all real sonar, two modalities)
| Source | Modality | Classes contributed |
|---|---|---|
| SubPipe | Side-scan sonar (HF channel), continuous AUV pipeline survey | `Pipeline` |
| SeabedObjects-KLSG | Side-scan sonar | `Aircraft`, `Fish`, `Other`, `Shipwreck` |
| Mine detection dataset | Sonar | `MILCO`, `NOMBO` |
| marine-debris-fls-datasets | ARIS forward-looking sonar | `Tire`, `Bottle`, `Drink-carton`, `Chain`, `Can`, `Valve`, `Propeller`, `Hook`, `Shampoo-bottle`, `Standing-bottle` |

See `notebooks/sonar_pipeline.ipynb` for the SubPipe ingestion/tiling code and
`notebooks/model_a_unified.ipynb` for the final merged training run.

### 2. Preprocessing
SubPipe's 5 survey "chunks" are pooled chronologically (they're one
continuous mission, so sorting by timestamp reconstructs the real survey
order) and tiled into **1000×500 rectangular tiles** (not square) with 200px
overlap — this preserves the pipeline's elongated shape instead of
distorting it with a square resize. About 89% of tiles were pure background,
which was suppressing recall, so negative tiles were capped at a 2:1 ratio
against positive ones.

### 3. Training
YOLOv8s, started from COCO-pretrained `yolov8s.pt` weights, `imgsz=640`,
`batch=24`. Augmentation is grayscale-appropriate (`hsv_h=0, hsv_s=0`, since
sonar has no meaningful hue) with moderate geometric jitter. `v2` is a
fine-tuned retrain that corrected a tile-overlap bug found in the original
Pipeline training data.

### 4. Validation
6,329 held-out images across all 4 sources:

| Metric | Value |
|---|---|
| Precision | 0.832 |
| Recall | 0.806 |
| mAP50 | 0.832 |
| mAP50-95 | 0.572 |

## Using the model

See `models/README.md` for a minimal usage snippet (just the `.pt` file +
`pip install ultralytics`).

For richer output — a side-by-side before/after image with a class legend,
plain-English labels, and structured JSON per detection — use
`scripts/visualize_detections.py`:

```bash
pip install -r requirements.txt
python3 scripts/visualize_detections.py --image path/to/sonar.png
```

`scripts/detect.py` exposes the same functionality as plain importable
functions (`load_model`, `run_inference`, `build_composite`, `encode_png`)
for a web backend to call directly, without going through the CLI.
