"""CLI wrapper around scripts/detect.py: run Model A on an image (or folder),
save a side-by-side before/after image with a legend, and print a
plain-English summary.

Usage:
    python scripts/visualize_detections.py --image path/to/sonar.png
    python scripts/visualize_detections.py --image path/to/folder/ --conf 0.3
"""
import argparse
import json
from pathlib import Path

from detect import DEFAULT_MODEL, build_composite, load_model, run_inference

REPO_ROOT = Path(__file__).resolve().parent.parent


def print_summary(image_name, detections):
    if not detections:
        print(f"{image_name}: nothing detected above the confidence threshold.")
        return
    print(f"{image_name}: {len(detections)} object(s) detected")
    for d in detections:
        print(f"  - {d['label']} [{d['category']}] -- {d['confidence'] * 100:.0f}% confidence")


def process_one(model, image_path, conf, out_dir):
    result = run_inference(model, str(image_path), conf=conf)
    print_summary(image_path.name, result["detections"])

    composite = build_composite(result, title=f"Model A Detection Result -- {image_path.name}")
    out_path = out_dir / f"{image_path.stem}_side_by_side.png"
    composite.save(out_path)

    json_path = out_dir / f"{image_path.stem}_detections.json"
    json_path.write_text(json.dumps(result["detections"], indent=2))

    return out_path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", required=True, help="Image file or folder of images")
    parser.add_argument("--model", default=str(DEFAULT_MODEL), help="Path to .pt weights")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold")
    parser.add_argument("--out", default="runs/detect/side_by_side", help="Folder to save output into")
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    model = load_model(args.model)

    source = Path(args.image)
    image_paths = sorted(
        p for p in source.glob("*") if p.suffix.lower() in (".png", ".jpg", ".jpeg")
    ) if source.is_dir() else [source]

    print()
    saved = []
    for image_path in image_paths:
        saved.append(process_one(model, image_path, args.conf, out_dir))
        print()

    print(f"Saved {len(saved)} side-by-side image(s) + JSON detection file(s) to: {out_dir}")


if __name__ == "__main__":
    main()
