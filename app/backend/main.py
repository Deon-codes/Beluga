from pathlib import Path
import tempfile

import numpy as np
import torch
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException

from ultralytics import YOLO
import segmentation_models_pytorch as smp


# ============================================================
# PATHS
# ============================================================

YOLO_PATH = Path(
    "/home/illusive/Documents/SIH/runs/detect/"
    "pipeline_tiled_1000x500/weights/best.pt"
)

UNET_PATH = Path(
    "/home/illusive/sonar-debris/models/unet_best.pth"
)


# ============================================================
# DEVICE
# ============================================================

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# ============================================================
# LOAD YOLO
# ============================================================

if not YOLO_PATH.exists():
    raise FileNotFoundError(
        f"YOLO model not found: {YOLO_PATH}"
    )

yolo = YOLO(str(YOLO_PATH))


# ============================================================
# LOAD U-NET
# ============================================================

if not UNET_PATH.exists():
    raise FileNotFoundError(
        f"U-Net model not found: {UNET_PATH}"
    )

unet = smp.Unet(
    encoder_name="resnet18",
    encoder_weights=None,
    in_channels=1,
    classes=1
).to(DEVICE)

unet.load_state_dict(
    torch.load(
        UNET_PATH,
        map_location=DEVICE
    )
)

unet.eval()


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="Underwater Sonar Hazard Detection API",
    version="0.1.0"
)


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "sonar-hazard-api",
        "device": str(DEVICE),
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "yolo_model": YOLO_PATH.name,
        "unet_model": UNET_PATH.name,
        "device": str(DEVICE),
    }


# ============================================================
# YOLO + U-NET INFERENCE
# ============================================================

@app.post("/predict")
async def predict(
    file: UploadFile = File(...)
):
    """
    Upload one grayscale sonar tile.

    Returns YOLO detections and U-Net mask measurements.
    """

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No filename supplied."
        )

    # --------------------------------------------------------
    # Read uploaded image
    # --------------------------------------------------------

    try:
        content = await file.read()

        image = Image.open(
            tempfile.SpooledTemporaryFile()
        )
    except Exception:
        # Re-open directly from bytes
        try:
            import io

            image = Image.open(
                io.BytesIO(content)
            ).convert("L")
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid image: {exc}"
            )

    image = np.array(
        image.convert("L")
    )

    H, W = image.shape

    # --------------------------------------------------------
    # YOLO
    # --------------------------------------------------------

    result = yolo.predict(
        source=image,
        conf=0.25,
        device=0 if torch.cuda.is_available() else "cpu",
        verbose=False
    )[0]

    detections = []

    # --------------------------------------------------------
    # Process every detection
    # --------------------------------------------------------

    for detection_id, box in enumerate(result.boxes):

        coords = (
            box.xyxy[0]
            .cpu()
            .numpy()
            .astype(int)
        )

        x0, y0, x1, y1 = coords

        x0 = max(0, min(x0, W - 1))
        x1 = max(0, min(x1, W))

        y0 = max(0, min(y0, H - 1))
        y1 = max(0, min(y1, H))

        if x1 <= x0 or y1 <= y0:
            continue

        confidence = float(
            box.conf[0].cpu().item()
        )

        crop = image[
            y0:y1,
            x0:x1
        ]

        # ----------------------------------------------------
        # U-Net
        # ----------------------------------------------------

        crop_h, crop_w = crop.shape

        resized = Image.fromarray(
            crop
        ).resize(
            (512, 256)
        )

        resized = np.asarray(
            resized,
            dtype=np.float32
        )

        resized = resized / 255.0
        resized = (resized - 0.5) / 0.5

        tensor = torch.from_numpy(
            resized
        ).unsqueeze(0).unsqueeze(0)

        tensor = tensor.to(DEVICE)

        with torch.no_grad():
            logits = unet(tensor)

            probability = torch.sigmoid(
                logits
            )[0, 0].cpu().numpy()

        # Resize mask back to crop dimensions
        mask = np.array(
            Image.fromarray(
                (probability * 255).astype(np.uint8)
            ).resize(
                (crop_w, crop_h)
            )
        ) / 255.0

        binary_mask = mask >= 0.5

        mask_pixels = int(
            np.count_nonzero(binary_mask)
        )

        # ----------------------------------------------------
        # Mask measurements
        # ----------------------------------------------------

        ys, xs = np.where(binary_mask)

        if len(xs) > 0:

            centroid_x = float(
                xs.mean() + x0
            )

            centroid_y = float(
                ys.mean() + y0
            )

            mask_width = int(
                xs.max() - xs.min() + 1
            )

            mask_height = int(
                ys.max() - ys.min() + 1
            )

        else:

            centroid_x = None
            centroid_y = None
            mask_width = 0
            mask_height = 0

        bbox_width = x1 - x0
        bbox_height = y1 - y0

        coverage = (
            mask_pixels /
            float(bbox_width * bbox_height)
        )

        # ----------------------------------------------------
        # Ranking score
        # ----------------------------------------------------

        ranking_score = (
            0.8 * confidence
            + 0.2 * min(coverage, 1.0)
        )

        detections.append({
            "detection_id": int(detection_id),
            "class": "Pipeline",
            "confidence": float(round(confidence, 4)),

            "bbox": {
                "x0": int(x0),
                "y0": int(y0),
                "x1": int(x1),
                "y1": int(y1),
                "width_px": int(bbox_width),
                "height_px": int(bbox_height),
            },

            "mask": {
                "area_px": int(mask_pixels),
                "width_px": int(mask_width),
                "height_px": int(mask_height),
                "coverage": float(round(coverage, 4)),
            },

            "centroid": {
                "x_px": (
                    None
                    if centroid_x is None
                    else float(centroid_x)
                ),
                "y_px": (
                    None
                    if centroid_y is None
                    else float(centroid_y)
                ),
            },

            "ranking_score": float(
                round(ranking_score, 4)
            ),
        })
    # Sort highest priority first
    detections.sort(
        key=lambda d: d["ranking_score"],
        reverse=True
    )

    return {
        "filename": file.filename,
        "image_width": W,
        "image_height": H,
        "detection_count": len(detections),
        "detections": detections,
    }
