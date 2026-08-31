# How the Model A pipeline works

This folder contains the actual code that built `model_a_unified_v2.pt`.
This file explains what each piece does and the order they run in, in plain
language.

## The short version

Four separate sonar/debris datasets get combined into one, a YOLOv8 model
gets trained on the combination, and the result is one detector that
recognizes 17 kinds of objects. Three pieces of code do this, in order:

1. **`sonar_pipeline.ipynb`** — prepares the largest and most complex source
   (SubPipe) for training.
2. **`../scripts/merge_datasets.py`** — combines all 4 sources into one
   unified dataset.
3. **`model_a_unified.ipynb`** — trains the final model on the combined
   dataset.

## Step 1 — Preparing SubPipe (`sonar_pipeline.ipynb`)

SubPipe is a real side-scan sonar survey of an underwater pipeline,
recorded as 5 chunks ("Chunk0" through "Chunk4") that together form one
continuous AUV mission. Raw sonar frames from a survey are far too large
and oddly shaped to feed straight into a detector, so this notebook:

- Loads the high-frequency sonar images from all 5 chunks and pools them
  in chronological order (since they're one continuous mission, sorting by
  timestamp puts them back in the order they were actually recorded).
- Cuts each large frame into **1000×500 pixel tiles** with a bit of overlap
  between neighboring tiles, so nothing at a tile edge gets missed. The
  tiles are wide rectangles on purpose — a plain square crop would distort
  the pipeline's long, thin shape.
- Notices that ~89% of tiles contain nothing (empty seafloor) and rebalances
  the training set so the model doesn't just learn to always say "nothing
  here" — background tiles are capped at 2 for every 1 tile that actually
  contains the pipeline.

The output of this step is a folder of tiles + YOLO-format label files,
ready to be merged with the other 3 datasets.

## Step 2 — Merging all 4 datasets (`../scripts/merge_datasets.py`)

Each of the 4 source datasets was built by different people, for different
purposes, so they don't agree on anything — different class lists, different
label formats, different folder layouts. This script is the piece that
reconciles all of that into one shared 17-class dataset:

| Source | What it is | Classes it contributes |
|---|---|---|
| SubPipe (from Step 1) | Side-scan sonar, pipeline survey | Pipeline |
| SeabedObjects-KLSG | Side-scan sonar, seabed objects | Aircraft, Fish, Other, Shipwreck |
| Mine detection dataset | Sonar, naval mine survey | MILCO, NOMBO |
| marine-debris-fls-datasets | Forward-looking sonar, water-tank debris | Tire, Bottle, Drink-carton, Chain, Can, Valve, Propeller, Hook, Shampoo-bottle, Standing-bottle |

For each source, the script:

- **Renumbers its classes** to match the unified 17-class list (e.g. KLSG's
  own "shipwreck" is class 3 in KLSG's own scheme, but becomes class 4 in
  the unified scheme, since Pipeline takes class 0 first).
- **Renames every file** with a prefix showing where it came from
  (`subpipe__...`, `klsg__...`, `mine__...`, `wtseg__...`), so nothing gets
  mixed up and you can always tell a detection's original source.
- **Keeps a dataset's own train/validation/test split if it has one**
  (KLSG ships with its own split — reusing it is better than throwing that
  away and re-splitting for no reason). The two sources with no split of
  their own (mine detection, watertank debris) get a random 80/10/10 split.
- For the watertank debris data specifically, it also **converts the label
  format**: that dataset's boxes are stored as raw pixel coordinates in XML
  files, and YOLO needs them as 0-to-1 normalized coordinates — the script
  does that conversion, and drops one class ("Wall") that isn't actually
  debris.

This script was rebuilt from scratch after we discovered the original
version had never been saved anywhere — but it's verified byte-for-byte
identical to the real merged dataset already used for training (same file
counts per split, same label content down to the exact box coordinates).

## Step 3 — Training the final model (`model_a_unified.ipynb`)

With one combined 17-class dataset ready, this notebook trains a YOLOv8s
model on it: 640×640 input images, augmentation settings tuned for sonar
(no color jitter, since sonar has no meaningful color), and moderate
geometric jitter so the model doesn't overfit to exact tile positions.

The result is `model_a_unified_v2.pt` — a fine-tuned version that corrected
a tile-overlap bug found in the first attempt, validated on 6,329 held-out
images across all 4 sources at 83% precision / 81% recall.
