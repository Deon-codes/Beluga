# Sonar Underwater Debris Detection

An end-to-end pipeline for detecting man-made objects (pipelines, shipwrecks,
naval mines, marine debris) in sonar imagery, built for SIH 2026.

## Repo layout

```
models/       trained checkpoint + its own usage README
notebooks/    the actual data pipeline + training code
scripts/      inference, visualization, and reporting tooling
```

## The Model A pipeline

`model_a_unified_v2.pt` is a YOLOv8s object detector trained on four merged
real sonar datasets, covering 17 classes. The full pipeline:

### 1. Data sources (all real sonar, two modalities)
| Source | Modality | Classes contributed |
|---|---|---|
| SubPipe | Side-scan sonar (HF channel), continuous AUV pipeline survey | `Pipeline` |
| SeabedObjects-KLSG | Side-scan sonar | `Aircraft`, `Fish`, `Other`, `Shipwreck` |
| Mine detection dataset | Sonar | `MILCO`, `NOMBO` |
| marine-debris-fls-datasets | ARIS forward-looking sonar | `Tire`, `Bottle`, `Drink-carton`, `Chain`, `Can`, `Valve`, `Propeller`, `Hook`, `Shampoo-bottle`, `Standing-bottle` |

See `notebooks/sonar_pipeline.ipynb` for the SubPipe ingestion/tiling code,
`scripts/merge_datasets.py` for how all 4 sources are combined into one
17-class dataset, and `notebooks/model_a_unified.ipynb` for the final merged
training run.

### 2. Preprocessing
SubPipe's 5 survey "chunks" are pooled chronologically (they're one
continuous mission, so sorting by timestamp reconstructs the real survey
order) and tiled into **1000×500 rectangular tiles** (not square) with 200px
overlap — this preserves the pipeline's elongated shape instead of
distorting it with a square resize. About 89% of tiles were pure background,
which was suppressing recall, so negative tiles were capped at a 2:1 ratio
against positive ones.

`scripts/merge_datasets.py` then combines all 4 sources into the unified
17-class dataset: each source's own class IDs get remapped into the shared
namespace (e.g. KLSG's `shipwreck=3` becomes unified ID `4`), images are
symlinked in with a `{source}__` filename prefix, and each source's
train/val/test split is used as-is where the dataset ships its own (KLSG),
or a random 80/10/10 split otherwise (mine detection, watertank).
Verified byte-for-byte against the live dataset: identical split counts and
identical label content (class IDs and box coordinates) for every source.

### 3. Training
YOLOv8s, started from COCO-pretrained `yolov8s.pt` weights, `imgsz=640`,
`batch=24`. Augmentation is grayscale-appropriate (`hsv_h=0, hsv_s=0`, since
sonar has no meaningful hue) with moderate geometric jitter. `v2` is a
fine-tuned retrain that corrected a tile-overlap bug found in the original
Pipeline training data.

### 4. Validation
6,329 held-out images across all 4 sources:

| Metric | Value |
|---|---|
| Precision | 0.832 |
| Recall | 0.806 |
| mAP50 | 0.832 |
| mAP50-95 | 0.572 |

## Using the model

See `models/README.md` for a minimal usage snippet (just the `.pt` file +
`pip install ultralytics`).

For richer output — a side-by-side before/after image with a class legend,
plain-English labels, and structured JSON per detection — use
`scripts/visualize_detections.py`:

```bash
pip install -r requirements.txt
python3 scripts/visualize_detections.py --image path/to/sonar.png
```

`scripts/detect.py` exposes the same functionality as plain importable
functions (`load_model`, `run_inference`, `build_composite`, `encode_png`)
for a web backend to call directly, without going through the CLI.

---

## References

### Datasets / Sonar Research

[1] A. V. Sethuraman, A. Sheppard, O. Bagoren, C. Pinnow, J. Anderson, T. C. Havens, and K. A. Skinner, "Machine learning for shipwreck segmentation from side scan sonar imagery: Dataset and benchmark," *arXiv preprint arXiv:2401.14546*, 2024.

[2] O. Álvarez-Tuñón, L. R. Marnet, L. Antal, M. Aubard, M. Costa, and Y. Brodskiy, "SubPipe: A submarine pipeline inspection dataset for segmentation and visual-inertial localization," in *Proc. OCEANS 2024*, Singapore, 2024, pp. 1–7, doi: 10.1109/OCEANS51537.2024.10682150.

[3] N. P. Santos, R. Moura, G. S. Torgal, V. Lobo, and M. de Castro Neto, "Side-scan sonar imaging data of underwater vehicles for mine detection," *Data in Brief*, vol. 53, Art. no. 110132, 2024, doi: 10.1016/j.dib.2024.110132.

[4] D. Singh and M. Valdenegro-Toro, "The marine debris dataset for forward-looking sonar semantic segmentation," in *Proc. IEEE/CVF Int. Conf. Comput. Vis. Workshops (ICCVW)*, 2021, pp. 3741–3749.

[5] M. J. Er, J. Chen, Y. Zhang, and W. Gao, "Research challenges, recent advances, and popular datasets in deep learning-based underwater marine object detection: A review," *Sensors*, vol. 23, no. 4, Art. no. 1990, 2023, doi: 10.3390/s23041990.

[6] M. Aubard, A. Madureira, L. Teixeira, and J. Pinto, "Sonar-based deep learning in underwater robotics: Overview, robustness and challenges," *arXiv preprint arXiv:2412.11840*, 2024.

### Detection / YOLO

[7] J. Terven, D. Córdova-Esparza, and J.-A. Romero-González, "A comprehensive review of YOLO architectures in computer vision: From YOLOv1 to YOLOv8 and YOLO-NAS," *Machine Learning and Knowledge Extraction*, vol. 5, no. 4, pp. 1680–1716, 2023, doi: 10.3390/make5040083.

[8] G. Jocher, A. Chaurasia, and J. Qiu, *Ultralytics YOLOv8*, version 8.0.0, 2023. [Online]. Available: https://github.com/ultralytics/ultralytics

### Explainability

[9] R. R. Selvaraju, M. Cogswell, A. Das, R. Vedantam, D. Parikh, and D. Batra, "Grad-CAM: Visual explanations from deep networks via gradient-based localization," in *Proc. IEEE Int. Conf. Comput. Vis. (ICCV)*, 2017, pp. 618–626, doi: 10.1109/ICCV.2017.74.

[10] M. B. Muhammad and M. Yeasin, "Eigen-CAM: Class activation map using principal components," *arXiv preprint arXiv:2008.00299*, 2020.

### Uncertainty Estimation

[11] Y. Gal and Z. Ghahramani, "Dropout as a Bayesian approximation: Representing model uncertainty in deep learning," in *Proc. 33rd Int. Conf. Mach. Learn. (ICML)*, vol. 48, 2016, pp. 1050–1059.

### Federated Learning

[12] B. McMahan, E. Moore, D. Ramage, S. Hampson, and B. A. y Arcas, "Communication-efficient learning of deep networks from decentralized data," in *Proc. 20th Int. Conf. Artif. Intell. Stat. (AISTATS)*, vol. 54, 2017, pp. 1273–1282.

### Contrastive Learning

[13] T. Chen, S. Kornblith, M. Norouzi, and G. Hinton, "A simple framework for contrastive learning of visual representations," in *Proc. 37th Int. Conf. Mach. Learn. (ICML)*, vol. 119, 2020, pp. 1597–1607.

### Edge Deployment / Quantization

[14] S. Boddu and A. Mukherjee, "Efficient edge deployment of quantized YOLOv4-Tiny for aerial emergency object detection on Raspberry Pi 5," *arXiv preprint arXiv:2506.09300*, 2025.
