"""Generate an aggregate survey report (JSON + CSV) for a folder of sonar
images: every detection across the whole folder, with priority tier, geotag
(where available), and a low-confidence flag, sorted by priority.

Usage:
    python scripts/generate_report.py --folder path/to/survey_images --out report_dir
"""
import argparse
from pathlib import Path

from detect import DEFAULT_MODEL, build_survey_report, load_model, write_report_csv, write_report_json


def print_summary(report):
    print(f"Survey: {report['survey_folder']}")
    print(f"Images processed: {report['num_images']}")
    print(f"Total detections: {report['num_detections']}")
    if not report["detections"]:
        return

    print("\nTop priority detections:")
    for d in report["detections"][:10]:
        geotag = d["geotag"]
        loc = f"({geotag['x_m']:.1f}, {geotag['y_m']:.1f}) m" if geotag else "no position data"
        flag = "  [LOW CONFIDENCE]" if d["low_confidence"] else ""
        print(f"  tier {d['priority_tier']} | {d['label']:30s} {d['confidence']*100:5.1f}%  "
              f"{d['source_image']:40s} {loc}{flag}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--folder", required=True, help="Folder of survey images")
    parser.add_argument("--model", default=str(DEFAULT_MODEL), help="Path to .pt weights")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold")
    parser.add_argument("--out", default="runs/detect/reports", help="Folder to write the report into")
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    model = load_model(args.model)
    report = build_survey_report(args.folder, model=model, conf=args.conf)

    survey_name = Path(args.folder).name or "survey"
    json_path = out_dir / f"{survey_name}_report.json"
    csv_path = out_dir / f"{survey_name}_report.csv"
    write_report_json(report, json_path)
    write_report_csv(report, csv_path)

    print()
    print_summary(report)
    print(f"\nSaved report to: {json_path} and {csv_path}")


if __name__ == "__main__":
    main()
