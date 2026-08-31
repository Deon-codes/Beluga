"""Regression test for the production MC-Dropout uncertainty bug.

Bug (memory obs #533): every live detection reported uncertainty_std=0.0 and
certainty="HIGH" regardless of actual confidence (40.55%-76.5% observed).

Root cause: run_mc_dropout toggled nn.Dropout to train() mode for stochasticity,
but model_a_unified_v2.pt has zero nn.Dropout layers (confirmed in this test and
in prior discovery obs #192/#295/#524). With no dropout and no other source of
randomness, every "pass" re-fed the identical image through the identical model
and produced bit-identical output, so std across passes was always 0.0.
"""
import glob
import os
import random

import pytest
import torch

from app.pipeline.detect import get_model, run_detection
from app.pipeline.uncertainty import run_mc_dropout


def _find_real_val_image():
    """Reuse the same positive-sample search as scripts/mc_dropout_uncertainty.py."""
    img_dir = "/home/nial-rojan/SIH 2026/sonar-debris/model_a_unified/val/images"
    label_dir = "/home/nial-rojan/SIH 2026/sonar-debris/model_a_unified/val/labels"
    if not os.path.isdir(img_dir):
        return None
    for lbl in sorted(glob.glob(f"{label_dir}/*.txt")):
        if os.path.getsize(lbl) == 0:
            continue
        stem = os.path.splitext(os.path.basename(lbl))[0]
        for ext in (".png", ".jpg", ".jpeg"):
            candidate = os.path.join(img_dir, stem + ext)
            if os.path.exists(candidate):
                return candidate
    return None


VAL_IMAGE = _find_real_val_image()


def test_model_has_no_dropout_layers():
    """Documents why literal MC-Dropout was never viable for this checkpoint."""
    model = get_model()
    dropout_count = sum(1 for m in model.model.modules() if isinstance(m, torch.nn.Dropout))
    assert dropout_count == 0


@pytest.mark.skipif(VAL_IMAGE is None, reason="validation image set not available in this environment")
def test_mc_dropout_uncertainty_is_not_always_zero():
    base_detections = run_detection(VAL_IMAGE, conf=0.25)
    assert len(base_detections) > 0, "expected at least one detection on a known-positive validation image"

    enriched = run_mc_dropout(VAL_IMAGE, base_detections, n_passes=8)

    stds = [d.uncertainty_std for d in enriched]
    assert any(s > 0.0 for s in stds), (
        f"all uncertainty_std values were 0.0 ({stds}) -- MC-Dropout pass is not "
        "introducing any stochasticity, reproducing bug obs #533"
    )
