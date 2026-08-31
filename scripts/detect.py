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
