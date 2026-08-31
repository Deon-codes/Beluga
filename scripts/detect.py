"""Core detection + visualization logic for Model A.

Deliberately separated from any CLI/file-saving concerns so a future web
backend can just do:

    from scripts.detect import load_model, run_inference, build_composite, encode_png

    model = load_model()
    result = run_inference(model, image_bytes_or_path)
    png_bytes = encode_png(result["composite"])

`run_inference` never touches disk itself (aside from ultralytics reading the
source image) and never prints -- it just returns numpy arrays + plain data,
so it's safe to call per-request from a server.
"""
import bisect
import csv
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from ultralytics import YOLO
from ultralytics.utils.plotting import colors

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MODEL = REPO_ROOT / "models" / "model_a_unified_v2.pt"

# Raw checkpoint class name -> (human-readable label, category).
# Categories drive nothing functional -- they're just shown in the legend so
# a non-technical viewer has a sense of "what kind of thing is this".
CLASS_INFO = {
    "Pipeline": ("Underwater pipeline", "Infrastructure"),
    "Aircraft": ("Aircraft wreckage", "Wreck"),
    "Fish": ("Fish / marine life", "Marine life"),
    "Other": ("Unidentified object", "Unclassified"),
    "Shipwreck": ("Shipwreck", "Wreck"),
    "MILCO": ("Mine-like contact (possible mine)", "Munition"),
    "NOMBO": ("Non-mine bottom object (likely not a mine)", "Munition"),
    "Tire": ("Tire", "Debris"),
    "Bottle": ("Bottle", "Debris"),
    "Drink-carton": ("Drink carton", "Debris"),
    "Chain": ("Chain", "Debris"),
    "Can": ("Can", "Debris"),
    "Valve": ("Valve", "Infrastructure"),
    "Propeller": ("Propeller", "Infrastructure"),
    "Hook": ("Hook", "Debris"),
    "Shampoo-bottle": ("Shampoo bottle", "Debris"),
    "Standing-bottle": ("Bottle, standing", "Debris"),
}

# Priority tier for survey reports (1 = highest). Grounded in the problem
# statement's own named examples (Pipeline, Shipwreck) plus their closest
# structural/wreck-adjacent relatives; general debris ranks below that; Fish
# and Other rank lowest since Fish is explicitly natural (not man-made) and
# Other is an ambiguous catch-all. MILCO/NOMBO deliberately sit in tier 2, not
# tier 1 -- the brief never mentions mines, so tier 1 is reserved strictly for
# what the text actually names.
PRIORITY_TIERS = {
    "Pipeline": 1,
    "Shipwreck": 1,
    "Aircraft": 2,
    "MILCO": 2,
    "NOMBO": 2,
    "Valve": 2,
    "Propeller": 2,
    "Bottle": 3,
    "Can": 3,
    "Chain": 3,
    "Drink-carton": 3,
    "Hook": 3,
    "Shampoo-bottle": 3,
    "Standing-bottle": 3,
    "Tire": 3,
    "Fish": 4,
    "Other": 4,
}

LOW_CONFIDENCE_THRESHOLD = 0.4

# SubPipe navigation data (real local x/y/z, meters -- not GPS lat/lon; no
# origin reference exists in this public dataset to convert to WGS84). Only
# covers subpipe__-prefixed detections; every other source has no positional
# data available at all.
SUBPIPE_ROOT = Path("/home/nial-rojan/SIH 2026/Datasets/Sub_pipe/SubPipe")
SUBPIPE_CHUNKS = ["Chunk0", "Chunk1", "Chunk2", "Chunk3", "Chunk4"]
MAX_GEOTAG_TIME_DIFF = 5.0  # seconds; beyond this a nav match is too stale to trust


def load_model(weights_path=DEFAULT_MODEL):
    return YOLO(str(weights_path))


def run_inference(model, source, conf=0.25):
    """Run detection on one image (path, bytes, or numpy array).

    Returns a dict:
      detections: list of {class_name, label, category, confidence, box}
      original:   BGR numpy array, original resolution
      annotated:  BGR numpy array, boxes/labels drawn (original resolution)
    """
    results = model.predict(source=source, conf=conf, verbose=False)[0]

    detections = []
    for box in results.boxes:
        cls_name = results.names[int(box.cls)]
        label, category = CLASS_INFO.get(cls_name, (cls_name, "Unclassified"))
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        detections.append({
            "class_id": int(box.cls),
            "class_name": cls_name,
            "label": label,
            "category": category,
            "confidence": float(box.conf),
            "box": [x1, y1, x2, y2],
        })

    return {
        "detections": detections,
        "original": results.orig_img,
        "annotated": results.plot(),
    }


_nav_cache = None


def _load_subpipe_nav():
    """Load and cache SubPipe's EstimatedState.csv rows (timestamp, x, y, z,
    depth) across all 5 chunks, sorted by timestamp for nearest-match lookup.
    Loaded once per process, not once per image -- there are thousands of
    rows per chunk and a survey report may cover hundreds of images."""
    global _nav_cache
    if _nav_cache is not None:
        return _nav_cache
    rows = []
    for chunk in SUBPIPE_CHUNKS:
        csv_path = SUBPIPE_ROOT / "DATA" / chunk / "EstimatedState.csv"
        if not csv_path.exists():
            continue
        with open(csv_path, newline="") as f:
            reader = csv.DictReader(f, skipinitialspace=True)
            for row in reader:
                try:
                    rows.append((
                        float(row["timestamp"]),
                        float(row["x (m)"]),
                        float(row["y (m)"]),
                        float(row["z (m)"]),
                        float(row["depth (m)"]),
                    ))
                except (KeyError, ValueError):
                    continue
    rows.sort(key=lambda r: r[0])
    _nav_cache = rows
    return rows


def geotag_lookup(image_path):
    """Real local x/y/z position (meters, AUV-relative) for a SubPipe tile,
    matched to the nearest navigation timestamp. Filenames encode the sonar
    ping's own timestamp (e.g. "subpipe__1693578504.579_tile1.png"), which is
    matched against SubPipe's own timestamped nav log -- not a synthetic or
    approximated position. Returns None for any other source (no positional
    data exists for KLSG/mine/watertank), or if no nav row is within
    MAX_GEOTAG_TIME_DIFF seconds of the query."""
    name = Path(image_path).stem
    if not name.startswith("subpipe__"):
        return None
    rest = name[len("subpipe__"):]
    ts_str = rest.split("_tile")[0]
    try:
        query_ts = float(ts_str)
    except ValueError:
        return None

    rows = _load_subpipe_nav()
    if not rows:
        return None
    timestamps = [r[0] for r in rows]
    idx = bisect.bisect_left(timestamps, query_ts)
    candidates = [i for i in (idx - 1, idx) if 0 <= i < len(rows)]
    if not candidates:
        return None
    best = min(candidates, key=lambda i: abs(rows[i][0] - query_ts))
    ts, x, y, z, depth = rows[best]
    if abs(ts - query_ts) > MAX_GEOTAG_TIME_DIFF:
        return None
    return {
        "x_m": x,
        "y_m": y,
        "z_m": z,
        "depth_m": depth,
        "nav_timestamp": ts,
        "time_diff_s": abs(ts - query_ts),
    }


def enrich_detection(det, image_path):
    """Add survey-report fields (priority tier, low-confidence flag, geotag,
    source image) to a single detection dict from run_inference()."""
    det = dict(det)
    det["priority_tier"] = PRIORITY_TIERS.get(det["class_name"], 4)
    det["low_confidence"] = det["confidence"] < LOW_CONFIDENCE_THRESHOLD
    det["geotag"] = geotag_lookup(image_path)
    det["source_image"] = Path(image_path).name
    return det


def build_survey_report(folder_path, model=None, conf=0.25):
    """Run detection across every image in a folder ("survey") and return one
    aggregate report: every detection, enriched with priority tier, geotag
    (where available), and a low-confidence flag -- sorted by priority tier
    first, then confidence within a tier. Low-confidence detections are kept
    in the report, not dropped, so a human can still review borderline calls
    rather than have them silently disappear."""
    if model is None:
        model = load_model()
    folder_path = Path(folder_path)
    image_paths = sorted(
        p for p in folder_path.glob("*") if p.suffix.lower() in (".png", ".jpg", ".jpeg")
    )

    all_detections = []
    for image_path in image_paths:
        result = run_inference(model, str(image_path), conf=conf)
        for det in result["detections"]:
            all_detections.append(enrich_detection(det, image_path))

    all_detections.sort(key=lambda d: (d["priority_tier"], -d["confidence"]))

    return {
        "survey_folder": str(folder_path),
        "num_images": len(image_paths),
        "num_detections": len(all_detections),
        "detections": all_detections,
    }


def write_report_json(report, path):
    Path(path).write_text(json.dumps(report, indent=2))


def write_report_csv(report, path):
    fieldnames = [
        "source_image", "class_name", "label", "category", "priority_tier",
        "confidence", "low_confidence", "box",
        "geotag_x_m", "geotag_y_m", "geotag_z_m", "geotag_depth_m",
    ]
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for d in report["detections"]:
            geotag = d.get("geotag") or {}
            writer.writerow({
                "source_image": d["source_image"],
                "class_name": d["class_name"],
                "label": d["label"],
                "category": d["category"],
                "priority_tier": d["priority_tier"],
                "confidence": round(d["confidence"], 4),
                "low_confidence": d["low_confidence"],
                "box": d["box"],
                "geotag_x_m": geotag.get("x_m", ""),
                "geotag_y_m": geotag.get("y_m", ""),
                "geotag_z_m": geotag.get("z_m", ""),
                "geotag_depth_m": geotag.get("depth_m", ""),
            })


def _resize_to_height(bgr_img, height):
    h, w = bgr_img.shape[:2]
    scale = height / h
    return cv2.resize(bgr_img, (int(round(w * scale)), height))


def build_composite(result, panel_height=480, title="Model A Detection Result"):
    """Build a side-by-side (original | detected) image with a legend of the
    classes found, as a single PIL Image ready to save or stream."""
    original = _resize_to_height(result["original"], panel_height)
    annotated = _resize_to_height(result["annotated"], panel_height)

    gap = 12
    margin = 20
    title_h = 40
    label_h = 28

    panel_w = max(original.shape[1], annotated.shape[1])

    font_title = _load_font(22, bold=True)
    font_label = _load_font(16, bold=True)
    font_legend = _load_font(15, bold=False)

    title_w = font_title.getlength(title)
    canvas_w = max(margin * 2 + panel_w * 2 + gap, int(title_w) + margin * 2)

    detections = result["detections"]
    unique_classes = sorted({d["class_name"] for d in detections})
    legend_h = 34 + len(unique_classes) * 26 + 16 if unique_classes else 40

    canvas_h = margin * 2 + title_h + label_h + panel_height + legend_h
    canvas = Image.new("RGB", (canvas_w, canvas_h), (250, 250, 248))
    draw = ImageDraw.Draw(canvas)

    draw.text((margin, margin), title, fill=(20, 20, 20), font=font_title)

    y_img = margin + title_h + label_h
    left_x = margin
    right_x = margin + panel_w + gap

    draw.text((left_x, margin + title_h), "Original", fill=(80, 80, 80), font=font_label)
    draw.text((right_x, margin + title_h), "Detected", fill=(80, 80, 80), font=font_label)

    orig_pil = Image.fromarray(cv2.cvtColor(original, cv2.COLOR_BGR2RGB))
    annot_pil = Image.fromarray(cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB))
    canvas.paste(orig_pil, (left_x, y_img))
    canvas.paste(annot_pil, (right_x, y_img))

    # Divider between the two panels.
    divider_x = left_x + panel_w + gap // 2
    draw.line([(divider_x, y_img), (divider_x, y_img + panel_height)], fill=(210, 210, 205), width=2)

    # Legend.
    legend_y = y_img + panel_height + 16
    if not unique_classes:
        draw.text((margin, legend_y), "No objects detected above the confidence threshold.",
                   fill=(120, 120, 120), font=font_legend)
    else:
        draw.text((margin, legend_y), "Legend", fill=(20, 20, 20), font=font_label)
        legend_y += 26
        for cls_name in unique_classes:
            class_id = next(d["class_id"] for d in detections if d["class_name"] == cls_name)
            # Same palette ultralytics' own annotator used to draw the boxes (bgr=False
            # for RGB, since that's what PIL expects -- annotator itself draws bgr=True
            # onto a BGR array, which nets out to the same final on-screen color).
            swatch_color = colors(class_id, False)
            label, category = CLASS_INFO.get(cls_name, (cls_name, "Unclassified"))
            best_conf = max(d["confidence"] for d in detections if d["class_name"] == cls_name)

            draw.rectangle([margin, legend_y + 2, margin + 18, legend_y + 20], fill=swatch_color)
            text = f"{label}  ({category}, up to {best_conf * 100:.0f}% confidence)"
            draw.text((margin + 28, legend_y), text, fill=(40, 40, 40), font=font_legend)
            legend_y += 26

    return canvas


_FONT_CANDIDATES_BOLD = [
    "DejaVuSans-Bold.ttf",  # common on Linux
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",  # macOS
    "C:/Windows/Fonts/arialbd.ttf",  # Windows
]
_FONT_CANDIDATES_REGULAR = [
    "DejaVuSans.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "C:/Windows/Fonts/arial.ttf",
]


def _load_font(size, bold=False):
    """No font is guaranteed to exist on every OS -- try common system fonts
    across Linux/macOS/Windows, then fall back to PIL's built-in bitmap font
    (always available, no external file needed) rather than crash."""
    for path in (_FONT_CANDIDATES_BOLD if bold else _FONT_CANDIDATES_REGULAR):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    try:
        return ImageFont.load_default(size=size)  # Pillow >= 10.1
    except TypeError:
        return ImageFont.load_default()  # older Pillow: fixed size, still renders


def encode_png(pil_image):
    """PIL Image -> PNG bytes, ready for a web response."""
    import io
    buf = io.BytesIO()
    pil_image.save(buf, format="PNG")
    return buf.getvalue()
