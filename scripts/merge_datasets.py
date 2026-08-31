"""Merge SubPipe (tiled), KLSG, mine-detection, and watertank-FLS datasets into
Model A's unified 17-class structure.

This step was run once to produce the live `model_a_unified/` dataset but was
never saved as code -- reconstructed here from the merged dataset's own
`{source}__{filename}` naming convention and verified against its actual file
counts before writing this:

    source     train  val   test   split origin
    SubPipe    7524   5910  0      tiled (1000x500) + class-balanced for
                                    train only (2:1 negative:positive cap);
                                    val is unbalanced, so it's bigger than
                                    train's post-balancing count despite the
                                    raw pool being train-majority
    KLSG       405    116   60     dataset's own pre-made train/valid/test
                                    split, preserved as-is
    Mine       936    117   117    no pre-made split -- clean 80/10/10
    Watertank  1494   186   188    no pre-made split -- ~80/10/10

Class ID remapping (source ID -> unified ID), confirmed from each source's
own class-list file (KLSG's data.yaml, mine detection's obj.names.txt,
watertank's README.md pixel-value table):

    SubPipe:   single class "Pipeline"                    -> 0 (no remap)
    KLSG:      aircraft=0, fish=1, other=2, shipwreck=3    -> +1 offset (1-4)
    Mine:      MILCO=0, NOMBO=1                            -> +5 offset (5-6)
    Watertank: 11 named classes including "Wall" (excluded,
               it's structural, not a debris object)       -> name lookup (7-16)

Writes to a separate `model_a_unified_rebuilt/` output directory rather than
the live `model_a_unified/`, so re-running this is always safe and never
touches the dataset the current model was actually trained on.
"""
import random
import xml.etree.ElementTree as ET
from pathlib import Path

random.seed(0)

SONAR_DEBRIS_ROOT = Path("/home/nial-rojan/SIH 2026/sonar-debris")
DATASETS_ROOT = Path("/home/nial-rojan/SIH 2026/Datasets")

SUBPIPE_TRAIN_SOURCE = SONAR_DEBRIS_ROOT / "yolo_tiled_1000_v2_balanced"  # balanced, train only
SUBPIPE_VAL_SOURCE = SONAR_DEBRIS_ROOT / "yolo_tiled_1000_v2"  # val was never balanced
KLSG_ROOT = DATASETS_ROOT / "SeabedObjects-KLSG_Dataset" / "archive"
MINE_ROOT = DATASETS_ROOT / "mine detection" / "24574879"
WATERTANK_ROOT = DATASETS_ROOT / "marine-debris-fls-datasets" / "md_fls_dataset" / "data" / "watertank-segmentation"

OUT_ROOT = SONAR_DEBRIS_ROOT / "model_a_unified_rebuilt"

UNIFIED_NAMES = [
    "Pipeline", "Aircraft", "Fish", "Other", "Shipwreck", "MILCO", "NOMBO",
    "Tire", "Bottle", "Drink-carton", "Chain", "Can", "Valve", "Propeller",
    "Hook", "Shampoo-bottle", "Standing-bottle",
]

KLSG_REMAP = {0: 1, 1: 2, 2: 3, 3: 4}  # aircraft, fish, other, shipwreck
MINE_REMAP = {0: 5, 1: 6}  # MILCO, NOMBO

_WATERTANK_DEBRIS_CLASSES = (
    "Tire", "Bottle", "Drink-carton", "Chain", "Can", "Valve", "Propeller",
    "Hook", "Shampoo-bottle", "Standing-bottle",
)
WATERTANK_CLASS_TO_UNIFIED_ID = {name: UNIFIED_NAMES.index(name) for name in _WATERTANK_DEBRIS_CLASSES}


def ensure_split_dirs(root):
    for split in ("train", "val", "test"):
        (root / split / "images").mkdir(parents=True, exist_ok=True)
        (root / split / "labels").mkdir(parents=True, exist_ok=True)


def write_data_yaml(root):
    lines = [f"path: {root}", "train: train/images", "val: val/images", "test: test/images", "", "nc: 17", "names:"]
    lines += [f"  {i}: {name}" for i, name in enumerate(UNIFIED_NAMES)]
    (root / "data.yaml").write_text("\n".join(lines) + "\n")


def link_pair(img_src, lbl_src, out_root, split, prefix):
    """Symlink an image+label pair into the merged dataset with the source
    prefix, matching the naming convention the live dataset already uses
    (subpipe__, klsg__, mine__, wtseg__)."""
    img_dst = out_root / split / "images" / f"{prefix}__{img_src.name}"
    lbl_dst = out_root / split / "labels" / f"{prefix}__{img_src.stem}.txt"
    if not img_dst.exists():
        img_dst.symlink_to(img_src.resolve())
    if not lbl_dst.exists():
        if lbl_src.exists():
            lbl_dst.symlink_to(lbl_src.resolve())
        else:
            lbl_dst.write_text("")  # background tile, no objects


def merge_subpipe(out_root):
    """SubPipe's own pipeline (notebooks/sonar_pipeline.ipynb) already
    produced tiled, class-balanced YOLO-format data at unified class ID 0
    (only one class, "Pipeline") -- just prefix and link it in."""
    for split, src_root in (("train", SUBPIPE_TRAIN_SOURCE), ("val", SUBPIPE_VAL_SOURCE)):
        img_dir = src_root / split / "images"
        lbl_dir = src_root / split / "labels"
        for img_path in sorted(img_dir.glob("*")):
            lbl_path = lbl_dir / f"{img_path.stem}.txt"
            link_pair(img_path, lbl_path, out_root, split, "subpipe")


def remap_label_file(src_path, remap):
    """Rewrite a YOLO label file's class IDs using `remap`."""
    if not src_path.exists() or src_path.stat().st_size == 0:
        return ""
    lines_out = []
    for line in src_path.read_text().splitlines():
        parts = line.split()
        if len(parts) != 5:
            continue
        parts[0] = str(remap[int(parts[0])])
        lines_out.append(" ".join(parts))
    return "\n".join(lines_out) + ("\n" if lines_out else "")


def merge_klsg(out_root):
    """KLSG ships its own train/valid/test split -- preserved as-is rather
    than re-splitting, since re-splitting a dataset-native split throws away
    a deliberate choice for no benefit."""
    for src_split, dst_split in (("train", "train"), ("valid", "val"), ("test", "test")):
        img_dir = KLSG_ROOT / src_split / "images"
        lbl_dir = KLSG_ROOT / src_split / "labels"
        for img_path in sorted(img_dir.glob("*")):
            lbl_path = lbl_dir / f"{img_path.stem}.txt"
            remapped = remap_label_file(lbl_path, KLSG_REMAP)
            img_dst = out_root / dst_split / "images" / f"klsg__{img_path.name}"
            lbl_dst = out_root / dst_split / "labels" / f"klsg__{img_path.stem}.txt"
            if not img_dst.exists():
                img_dst.symlink_to(img_path.resolve())
            lbl_dst.write_text(remapped)


def random_split(items, train=0.8, val=0.1):
    """80/10/10 split, matching the ratio actually observed in the live
    dataset's mine/watertank counts (neither source has a native split)."""
    items = items[:]
    random.shuffle(items)
    n = len(items)
    n_train = int(n * train)
    n_val = int(n * val)
    return items[:n_train], items[n_train:n_train + n_val], items[n_train + n_val:]


def merge_mine(out_root):
    img_paths = sorted(p for p in MINE_ROOT.glob("*/*.jpg") if "Training" not in p.parts)
    train_imgs, val_imgs, test_imgs = random_split(img_paths)
    for split, imgs in (("train", train_imgs), ("val", val_imgs), ("test", test_imgs)):
        for img_path in imgs:
            lbl_path = img_path.with_suffix(".txt")
            remapped = remap_label_file(lbl_path, MINE_REMAP)
            img_dst = out_root / split / "images" / f"mine__{img_path.name}"
            lbl_dst = out_root / split / "labels" / f"mine__{img_path.stem}.txt"
            if not img_dst.exists():
                img_dst.symlink_to(img_path.resolve())
            lbl_dst.write_text(remapped)


def parse_watertank_xml(xml_path, img_w, img_h):
    """Pascal-VOC-style XML with absolute pixel x,y,w,h (top-left origin) ->
    YOLO-format normalized class_id, x_center, y_center, w, h. "Wall" objects
    are dropped -- structural, not debris."""
    root = ET.parse(xml_path).getroot()
    lines = []
    for obj in root.findall("object"):
        name = obj.find("name").text
        if name not in WATERTANK_CLASS_TO_UNIFIED_ID:
            continue
        box = obj.find("bndbox")
        x = float(box.find("x").text)
        y = float(box.find("y").text)
        w = float(box.find("w").text)
        h = float(box.find("h").text)
        xc, yc = (x + w / 2) / img_w, (y + h / 2) / img_h
        lines.append(f"{WATERTANK_CLASS_TO_UNIFIED_ID[name]} {xc:.6f} {yc:.6f} {w / img_w:.6f} {h / img_h:.6f}")
    return "\n".join(lines) + ("\n" if lines else "")


def merge_watertank(out_root):
    xml_paths = sorted((WATERTANK_ROOT / "BoxAnnotations").glob("*.xml"))
    train_xmls, val_xmls, test_xmls = random_split(xml_paths)
    for split, xmls in (("train", train_xmls), ("val", val_xmls), ("test", test_xmls)):
        for xml_path in xmls:
            root = ET.parse(xml_path).getroot()
            img_name = root.find("filename").text
            img_w = int(root.find("size/width").text)
            img_h = int(root.find("size/height").text)
            img_path = WATERTANK_ROOT / "Images" / img_name
            if not img_path.exists():
                continue
            label_content = parse_watertank_xml(xml_path, img_w, img_h)
            img_dst = out_root / split / "images" / f"wtseg__{img_path.name}"
            lbl_dst = out_root / split / "labels" / f"wtseg__{img_path.stem}.txt"
            if not img_dst.exists():
                img_dst.symlink_to(img_path.resolve())
            lbl_dst.write_text(label_content)


def main():
    ensure_split_dirs(OUT_ROOT)
    print("Merging SubPipe (Pipeline)...")
    merge_subpipe(OUT_ROOT)
    print("Merging KLSG (Aircraft/Fish/Other/Shipwreck)...")
    merge_klsg(OUT_ROOT)
    print("Merging mine detection (MILCO/NOMBO)...")
    merge_mine(OUT_ROOT)
    print("Merging watertank-FLS debris (10 classes)...")
    merge_watertank(OUT_ROOT)
    write_data_yaml(OUT_ROOT)

    print()
    for split in ("train", "val", "test"):
        n = len(list((OUT_ROOT / split / "images").glob("*")))
        print(f"{split}: {n} images")
    print(f"\nDone. Unified dataset at {OUT_ROOT}")


if __name__ == "__main__":
    main()
