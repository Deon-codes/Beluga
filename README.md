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

See `notebooks/sonar_pipeline.ipynb` for the SubPipe ingestion/tiling code,
`scripts/merge_datasets.py` for how all 4 sources are combined into one
17-class dataset, and `notebooks/model_a_unified.ipynb` for the final merged
training run.

### 2. Preprocessing
SubPipe's 5 survey "chunks" are pooled chronologically (they're one
continuous mission, so sorting by timestamp reconstructs the real survey
order) and tiled into **1000×500 rectangular tiles** (not square) with 200px
overlap — this preserves the pipeline's elongated shape instead of
distorting it with a square resize. About 89% of tiles were pure background,
which was suppressing recall, so negative tiles were capped at a 2:1 ratio
against positive ones.

`scripts/merge_datasets.py` then combines all 4 sources into the unified
17-class dataset: each source's own class IDs get remapped into the shared
namespace (e.g. KLSG's `shipwreck=3` becomes unified ID `4`), images are
symlinked in with a `{source}__` filename prefix, and each source's
train/val/test split is used as-is where the dataset ships its own (KLSG),
or a random 80/10/10 split otherwise (mine detection, watertank).
Verified byte-for-byte against the live dataset: identical split counts and
identical label content (class IDs and box coordinates) for every source.

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

## Survey reports (priority ranking + geotagging)

`scripts/generate_report.py` runs detection across a whole folder of sonar
images (a "survey") and produces one aggregate report (JSON + CSV) instead
of per-image output:

```bash
python3 scripts/generate_report.py --folder path/to/survey_images --out report_dir
```

Each detection in the report gets:
- **A priority tier** (1 = highest), grounded in the problem statement's own
  named examples (`Pipeline`, `Shipwreck` = tier 1) rather than an invented
  scheme — see `PRIORITY_TIERS` in `scripts/detect.py` for the full mapping
  and reasoning. Sorted by tier first, then confidence within a tier.
- **A geotag, where real position data exists.** Only `Pipeline`-class
  detections from SubPipe get one — matched by timestamp against SubPipe's
  own AUV navigation log (`EstimatedState.csv`). This is real **local x/y/z
  position in meters, not GPS latitude/longitude** — no GPS origin reference
  exists in the public dataset to convert to true coordinates. The nav log
  also doesn't cover the *entire* sonar recording (it starts partway into
  Chunk0 and ends partway through Chunk4), so even within SubPipe, some
  detections will have no geotag. Every other source (KLSG, mine detection,
  watertank) has no positional data available at all, and reports that
  honestly as a null geotag rather than fabricating one.
- **A low-confidence flag** (below 40%) rather than being silently dropped
  from the report — so a human reviewer can still see borderline detections
  instead of them disappearing. A separate, more rigorous TTA-based
  uncertainty scoring tool exists (20 augmented passes per image, giving a
  confidence ± spread rather than a single number) but isn't in this repo
  yet — it's too slow to run on every detection in a large survey, so this
  report uses a fast single-pass threshold as a first-pass filter instead.
