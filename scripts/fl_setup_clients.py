"""Partition Model A's training set into 4 federated 'clients' by original dataset
source (subpipe/watertank/klsg/mine) -- a more realistic non-IID split than an
artificial random partition, since these genuinely come from different sensors/
collection campaigns. Validation stays shared across all clients so the global
model's progress is comparable round to round."""
import os
from pathlib import Path

SRC_ROOT = Path("/home/nial-rojan/SIH 2026/sonar-debris/model_a_unified")
CLIENTS_ROOT = Path("/home/nial-rojan/SIH 2026/sonar-debris/fl_clients")
PREFIXES = {"subpipe": "subpipe__", "wtseg": "wtseg__", "klsg": "klsg__", "mine": "mine__"}

NAMES = """  0: Pipeline
  1: Aircraft
  2: Fish
  3: Other
  4: Shipwreck
  5: MILCO
  6: NOMBO
  7: Tire
  8: Bottle
  9: Drink-carton
  10: Chain
  11: Can
  12: Valve
  13: Propeller
  14: Hook
  15: Shampoo-bottle
  16: Standing-bottle"""

def setup_clients(src_root=SRC_ROOT, clients_root=CLIENTS_ROOT, prefixes=PREFIXES, verbose=True):
    """Partition src_root's train split into per-client symlink trees under
    clients_root, one per (client, prefix) pair. Returns {client: n_images}."""
    counts = {}
    for client, prefix in prefixes.items():
        img_dir = clients_root / client / "train" / "images"
        lbl_dir = clients_root / client / "train" / "labels"
        img_dir.mkdir(parents=True, exist_ok=True)
        lbl_dir.mkdir(parents=True, exist_ok=True)

        src_images = sorted((src_root / "train" / "images").glob(f"{prefix}*"))
        n = 0
        for img_path in src_images:
            link = img_dir / img_path.name
            if not link.exists():
                link.symlink_to(img_path.resolve())
            lbl_src = (src_root / "train" / "labels" / (img_path.stem + ".txt")).resolve()
            lbl_link = lbl_dir / (img_path.stem + ".txt")
            if lbl_src.exists() and not lbl_link.exists():
                lbl_link.symlink_to(lbl_src)
            n += 1

        yaml_path = clients_root / client / "data.yaml"
        yaml_path.write_text(
            f"path: {clients_root / client}\n"
            f"train: train/images\n"
            f"val: {src_root / 'val' / 'images'}\n"
            f"\nnc: 17\nnames:\n{NAMES}\n"
        )
        counts[client] = n
        if verbose:
            print(f"{client}: {n} images -> {img_dir}  (data.yaml -> {yaml_path})")

    if verbose:
        print("\nDone setting up FL client partitions.")
    return counts


if __name__ == "__main__":
    setup_clients()
