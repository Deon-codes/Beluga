import glob
import os

import numpy as np
import pytest
import torch

import contrastive_pretrain as cp

TRAIN_IMAGES_AVAILABLE = os.path.isdir(cp.TRAIN_IMAGES_DIR) and len(glob.glob(f"{cp.TRAIN_IMAGES_DIR}/*")) >= 4


def test_random_augment_output_shape_and_range():
    img = np.random.randint(0, 255, (256, 256, 3), dtype=np.uint8)
    out = cp.random_augment(img)
    assert out.shape == (cp.IMG_SIZE, cp.IMG_SIZE, 3)
    assert out.dtype == np.float32
    assert out.min() >= 0.0 and out.max() <= 1.0


def test_projection_head_output_shape():
    head = cp.ProjectionHead(in_dim=512, hidden=64, out_dim=32)
    x = torch.randn(4, 512)
    out = head(x)
    assert out.shape == (4, 32)


def test_nt_xent_loss_is_finite_and_scalar():
    z1 = torch.randn(8, 32)
    z2 = torch.randn(8, 32)
    loss = cp.nt_xent_loss(z1, z2, temperature=0.5)
    assert loss.dim() == 0
    assert torch.isfinite(loss)


def test_nt_xent_loss_lower_for_matched_pairs_than_random_pairs():
    torch.manual_seed(0)
    n, d = 16, 32
    base = torch.randn(n, d)
    matched = cp.nt_xent_loss(base, base + 0.01 * torch.randn(n, d), temperature=0.5)
    shuffled = base[torch.randperm(n)]
    random_pairs = cp.nt_xent_loss(base, shuffled, temperature=0.5)
    assert matched.item() < random_pairs.item()


@pytest.mark.skipif(not TRAIN_IMAGES_AVAILABLE, reason="training image pool not available in this environment")
def test_load_batch_returns_two_augmented_views():
    all_images = glob.glob(f"{cp.TRAIN_IMAGES_DIR}/*")[:4]
    v1, v2 = cp.load_batch(all_images)
    assert v1.shape == (len(all_images), 3, cp.IMG_SIZE, cp.IMG_SIZE)
    assert v2.shape == v1.shape
    # two independently-augmented views of the same images should differ
    assert not torch.allclose(v1, v2)


@pytest.mark.skipif(not TRAIN_IMAGES_AVAILABLE, reason="training image pool not available in this environment")
def test_main_tiny_run_produces_finite_losses_and_transfers_cleanly(tmp_path):
    out_backbone = tmp_path / "backbone.pt"
    losses, transfer_ok = cp.main(
        n_steps=2, batch_size=4, device=torch.device("cpu"),
        out_backbone=str(out_backbone), verbose=False,
    )

    assert len(losses) == 2
    assert all(np.isfinite(losses))
    assert out_backbone.exists()
    assert transfer_ok is True


@pytest.mark.skipif(not TRAIN_IMAGES_AVAILABLE, reason="training image pool not available in this environment")
def test_verify_backbone_transfer_detects_shape_mismatch():
    mismatched_sd = {"not.a.real.key": torch.zeros(1)}
    ok, missing, unexpected = cp.verify_backbone_transfer(mismatched_sd)
    assert ok is False
    assert len(missing) > 0
    assert "not.a.real.key" in unexpected
