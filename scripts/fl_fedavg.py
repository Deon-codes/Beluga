"""Federated learning simulation (FedAvg) over Model A's 4 real dataset sources
as clients (subpipe / watertank / klsg / mine detection) -- a genuinely
non-IID split since each comes from a different sensor/collection campaign,
rather than an artificial random partition of one dataset.

Starts from the current best.pt (already-trained global model) and runs R
rounds of: each client fine-tunes locally for 1 epoch on only its own data,
then the server averages all 4 clients' weights (FedAvg, weighted by client
dataset size) into the new global model. The global model is validated on
the shared val set after each round to track progress.
"""
import copy
import os
from pathlib import Path

import torch
from ultralytics import YOLO
from ultralytics.models.yolo.detect import DetectionTrainer
from ultralytics.utils.torch_utils import strip_optimizer


class FastTrainer(DetectionTrainer):
    """Skips the redundant validation pass -- we only need each client's trained
    weights for FedAvg, not its individual metrics.

    Overriding final_eval() alone (as an earlier version of this class did) does
    NOT skip validation: BaseTrainer._do_train() unconditionally validates on the
    final epoch regardless of args.val ('if self.args.val or final_epoch or ...'),
    and since LOCAL_EPOCHS=1 every epoch here IS the final epoch. That in-loop
    call runs before final_eval ever executes, so the earlier override was
    skipping a validation call that was never the one actually happening --
    verified empirically: each client still spent ~13 min validating over the
    full 6329-image shared val set despite the override, confirmed via a live
    run's log/timing. The actual fix is to override validate() itself, which
    ultralytics already treats (None, None) as the documented val=False skip
    signal (see EarlyStopping.__call__: "fitness=None (happens when val=False)"),
    so this is the sanctioned way to opt out, not a hack.

    Keeps the strip_optimizer call, which is what actually produces the saved
    checkpoint (and promotes EMA weights into it), so the extracted weights are
    identical to the normal path; only the read-only metrics computation is
    skipped.

    validate() must return ({}, None), not (None, None): _do_train() does
    self.metrics, self.fitness = self.validate() unconditionally, then later
    unpacks {**self.metrics} in save_metrics() -- (None, None) crashes there
    with "'NoneType' object is not a mapping" (hit this empirically). An empty
    dict is the correct "nothing to log" value; fitness=None is what
    EarlyStopping.__call__ already documents handling (returns False, no crash)."""

    def validate(self):
        return {}, None

    def final_eval(self):
        if self.last.exists():
            strip_optimizer(self.last)
        if self.best.exists():
            strip_optimizer(self.best)


GLOBAL_START = "/home/nial-rojan/SIH 2026/sonar-debris/runs/detect/model_a_unified_v2/weights/best.pt"
CLIENTS_ROOT = Path("/home/nial-rojan/SIH 2026/sonar-debris/fl_clients")
RUN_ROOT = "/home/nial-rojan/SIH 2026/sonar-debris/runs/detect"
DATA_YAML_GLOBAL = "/home/nial-rojan/SIH 2026/sonar-debris/model_a_unified/data.yaml"

CLIENT_SIZES = {"subpipe": 7524, "wtseg": 1494, "klsg": 405, "mine": 936}
N_ROUNDS = 1
LOCAL_EPOCHS = 1


def get_state_dict(ckpt_path):
    m = YOLO(ckpt_path).model
    return copy.deepcopy(m.state_dict())


def fedavg(state_dicts, weights):
    total = sum(weights)
    avg = {}
    for key in state_dicts[0]:
        stacked = torch.stack(
            [sd[key].float() * (w / total) for sd, w in zip(state_dicts, weights)], dim=0
        )
        summed = stacked.sum(dim=0)
        avg[key] = summed.to(state_dicts[0][key].dtype)
    return avg


def save_global_ckpt(template_ckpt_path, new_state_dict, out_path):
    ckpt = torch.load(template_ckpt_path, map_location="cpu", weights_only=False)
    model_obj = ckpt["model"]
    model_obj.load_state_dict(new_state_dict, strict=True)
    ckpt["model"] = model_obj
    torch.save(ckpt, out_path)


def main():
    global_ckpt = GLOBAL_START
    print(f"Starting FL simulation: {N_ROUNDS} rounds, clients={list(CLIENT_SIZES)}, "
          f"local_epochs={LOCAL_EPOCHS}\n")

    for rnd in range(1, N_ROUNDS + 1):
        print(f"=== Round {rnd} ===")
        client_state_dicts = []
        client_weights = []

        for client, size in CLIENT_SIZES.items():
            run_name = f"fl_{client}_r{rnd}"
            client_ckpt = f"{RUN_ROOT}/{run_name}/weights/last.pt"

            if os.path.exists(client_ckpt):
                print(f"  [client={client}] checkpoint already exists, reusing it (skip retrain).")
            else:
                print(f"  [client={client}] local training ({size} images, {LOCAL_EPOCHS} epoch)...")
                model = YOLO(global_ckpt)
                model.train(
                    trainer=FastTrainer,
                    data=str(CLIENTS_ROOT / client / "data.yaml"),
                    epochs=LOCAL_EPOCHS,
                    batch=24,
                    imgsz=640,
                    device=0,
                    workers=0,
                    project=RUN_ROOT,
                    name=run_name,
                    exist_ok=True,
                    val=False,
                    verbose=False,
                    plots=False,
                    patience=0,
                )
                print(f"  [client={client}] done.")

            client_state_dicts.append(get_state_dict(client_ckpt))
            client_weights.append(size)

        print("  Aggregating (FedAvg, weighted by client size)...")
        new_global_sd = fedavg(client_state_dicts, client_weights)

        new_global_path = f"{RUN_ROOT}/fl_global_round{rnd}.pt"
        save_global_ckpt(global_ckpt, new_global_sd, new_global_path)
        global_ckpt = new_global_path
        print(f"  New global checkpoint: {global_ckpt}")

        print("  Validating global model on shared val set...")
        val_model = YOLO(global_ckpt)
        metrics = val_model.val(data=DATA_YAML_GLOBAL, verbose=False, plots=False, workers=0)
        print(f"  Round {rnd} global metrics: "
              f"precision={metrics.box.mp:.3f} recall={metrics.box.mr:.3f} "
              f"mAP50={metrics.box.map50:.3f} mAP50-95={metrics.box.map:.3f}\n")

    print(f"FL simulation complete. Final global model: {global_ckpt}")


if __name__ == "__main__":
    main()
