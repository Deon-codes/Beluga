"""Self-supervised contrastive pretraining (SimCLR-style) on Model A's unlabeled
sonar tile pool, then transfer the learned backbone weights into a fresh YOLOv8
backbone.

Deliberately avoids torch DataLoader multiprocessing entirely (synchronous batch
loading in the main process) -- every DataLoader-worker-based script today has
hit Python 3.14's forkserver instability (hangs, crashes, 14x slowdowns). Images
are also small pretraining crops (128x128, not the full 640x640 detection res)
since the goal here is demonstrating the pretraining mechanism, not SOTA
representations.

Scope note: this produces a pretrained backbone and demonstrates it loads
cleanly into a fresh YOLO model. It does NOT run a full downstream detection
fine-tune to compare final mAP against the existing model -- that would be
another multi-epoch training run on top of everything already done today.
"""
import glob
import random
import time

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from ultralytics import YOLO

IMG_SIZE = 128
BATCH_SIZE = 64
N_STEPS = 300
TEMPERATURE = 0.5
LR = 3e-4
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

TRAIN_IMAGES_DIR = "/home/nial-rojan/SIH 2026/sonar-debris/model_a_unified/train/images"
OUT_BACKBONE = "/home/nial-rojan/SIH 2026/sonar-debris/runs/detect/contrastive_backbone.pt"


def random_augment(img):
    h, w = img.shape[:2]
    # random-resized-crop
    scale = random.uniform(0.5, 1.0)
    ch, cw = int(h * scale), int(w * scale)
    y0 = random.randint(0, h - ch)
    x0 = random.randint(0, w - cw)
    crop = img[y0:y0 + ch, x0:x0 + cw]
    crop = cv2.resize(crop, (IMG_SIZE, IMG_SIZE))
    if random.random() < 0.5:
        crop = crop[:, ::-1]
    brightness = random.uniform(0.7, 1.3)
    gamma = random.uniform(0.8, 1.2)
    crop = np.clip(crop.astype(np.float32) / 255.0 * brightness, 0, 1) ** gamma
    if random.random() < 0.3:
        crop = cv2.GaussianBlur(crop, (5, 5), 0)
    return crop.astype(np.float32)


def load_batch(paths, device=DEVICE):
    view1, view2 = [], []
    for p in paths:
        img = cv2.imread(p)
        if img is None:
            continue
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        view1.append(random_augment(img))
        view2.append(random_augment(img))
    v1 = torch.from_numpy(np.stack(view1)).permute(0, 3, 1, 2)
    v2 = torch.from_numpy(np.stack(view2)).permute(0, 3, 1, 2)
    return v1.to(device), v2.to(device)


def nt_xent_loss(z1, z2, temperature):
    n = z1.shape[0]
    z1 = F.normalize(z1, dim=1)
    z2 = F.normalize(z2, dim=1)
    z = torch.cat([z1, z2], dim=0)  # (2n, d)
    sim = z @ z.T / temperature  # (2n, 2n)
    sim.fill_diagonal_(-1e9)
    targets = torch.cat([torch.arange(n, 2 * n), torch.arange(0, n)]).to(z.device)
    return F.cross_entropy(sim, targets)


class ProjectionHead(nn.Module):
    def __init__(self, in_dim=512, hidden=512, out_dim=128):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, hidden), nn.ReLU(inplace=True), nn.Linear(hidden, out_dim)
        )

    def forward(self, x):
        return self.net(x)


def verify_backbone_transfer(pretrained_sd, arch_yaml="yolov8s.yaml"):
    """Check pretrained_sd's keys/shapes match a fresh YOLO backbone (layers
    0-9) and, if so, actually load them. Returns (ok, missing, unexpected)."""
    target = YOLO(arch_yaml)
    target_backbone_sd = target.model.model[:10].state_dict()
    missing = set(target_backbone_sd.keys()) - set(pretrained_sd.keys())
    unexpected = set(pretrained_sd.keys()) - set(target_backbone_sd.keys())
    if missing or unexpected:
        return False, missing, unexpected
    target.model.model[:10].load_state_dict(pretrained_sd, strict=True)
    return True, missing, unexpected


def main(
    n_steps=N_STEPS, batch_size=BATCH_SIZE, img_size=IMG_SIZE, temperature=TEMPERATURE,
    lr=LR, device=DEVICE, train_images_dir=TRAIN_IMAGES_DIR, out_backbone=OUT_BACKBONE,
    arch_yaml="yolov8s.yaml", verbose=True,
):
    if verbose:
        print(f"Device: {device}")
        print("Building fresh (randomly initialized) YOLOv8s backbone...")
    fresh = YOLO(arch_yaml)
    backbone = fresh.model.model[:10].to(device)  # layers 0-9: Conv..SPPF, ends at 512ch
    proj_head = ProjectionHead(in_dim=512).to(device)

    params = list(backbone.parameters()) + list(proj_head.parameters())
    optimizer = torch.optim.Adam(params, lr=lr)

    all_images = glob.glob(f"{train_images_dir}/*")
    if verbose:
        print(f"Pretraining pool: {len(all_images)} images (labels ignored -- self-supervised)")
        print(f"Steps: {n_steps}, batch_size: {batch_size}, img_size: {img_size}\n")

    backbone.train()
    proj_head.train()
    t0 = time.time()
    losses = []

    for step in range(1, n_steps + 1):
        batch_paths = random.sample(all_images, batch_size)
        v1, v2 = load_batch(batch_paths, device=device)

        feat1 = backbone(v1)  # (B, 512, h, w)
        feat2 = backbone(v2)
        pooled1 = F.adaptive_avg_pool2d(feat1, 1).flatten(1)  # (B, 512)
        pooled2 = F.adaptive_avg_pool2d(feat2, 1).flatten(1)
        z1 = proj_head(pooled1)
        z2 = proj_head(pooled2)

        loss = nt_xent_loss(z1, z2, temperature)

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        losses.append(loss.item())
        if verbose and (step % 20 == 0 or step == 1):
            avg = sum(losses[-20:]) / len(losses[-20:])
            elapsed = time.time() - t0
            print(f"  step {step:4d}/{n_steps}  loss={loss.item():.4f}  avg20={avg:.4f}  elapsed={elapsed:.0f}s")

    if verbose:
        print(f"\nPretraining done in {time.time() - t0:.0f}s. "
              f"Loss: {losses[0]:.4f} -> {sum(losses[-min(20, len(losses)):]) / min(20, len(losses)):.4f}")

    torch.save(backbone.state_dict(), out_backbone)
    if verbose:
        print(f"Pretrained backbone saved: {out_backbone}")
        print("\nVerifying transfer into a fresh YOLO model's backbone...")

    ok, missing, unexpected = verify_backbone_transfer(backbone.state_dict(), arch_yaml=arch_yaml)
    if verbose:
        if not ok:
            print(f"  WARNING: key mismatch. missing={len(missing)} unexpected={len(unexpected)}")
        else:
            print("  Transfer OK: all backbone layers loaded with matching shapes, no mismatches.")

    return losses, ok


if __name__ == "__main__":
    main()
