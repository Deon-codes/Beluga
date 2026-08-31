# Scoped Requirements — SONAR-AI (SIH Problem Statement 26057)

## Tier 0: Mandatory Core Deliverables (Highest Evaluator Rubric Weight)

- [ ] **REQ-T0-01 (Geotagging Engine)**: Backend converts detected bounding box pixel positions into WGS84 GPS latitude and longitude using along-track and across-track calculations with anchor-point linear interpolation fallback.
- [ ] **REQ-T0-02 (Bounding Dimensions in Real Meters)**: Output real-world metric dimensions (Length $\times$ Width $\times$ Height in meters) based on sonar resolution settings and acoustic shadow geometry.
- [ ] **REQ-T0-03 (Structured Export Formats)**: Backend and frontend provide downloadable reports in both `.json` (hierarchical survey log) and `.csv` (tabular spreadsheet format).
- [ ] **REQ-T0-04 (YOLOv8s Inference Integration)**: Backend loads `models/model_a_unified_v2.pt` and performs inference returning bounding boxes for all 17 classes with class names and normalized coordinates.

---

## Tier 1: High-Value Technical Differentiators

- [ ] **REQ-T1-01 (Uncertainty-Aware Confidence Scoring)**: Multi-pass Monte Carlo Dropout returning mean confidence percentage ($0\% - 100\%$) and certainty classification (`HIGH`, `MODERATE`, `LOW`) based on standard deviation.
- [ ] **REQ-T1-02 (Acoustic Noise & Rock-Cluster Filter)**: Algorithmic rule filter checking down-range shadow regions and bounding box aspect ratios to discard false positives.
- [ ] **REQ-T1-03 (Multi-Look Tiling / Tile IoU Merging)**: Handles wide sonar strips via overlapping tile passes with IoU non-maximum suppression across seam boundaries.
- [ ] **REQ-T1-04 (Edge Deployment Readability)**: Support lightweight inference mode / ONNX export profile for edge drone operations.

---

## Tier 2: Frontend Command Center & User Experience

- [ ] **REQ-T2-01 (Interactive Sonar Canvas Viewport)**: Canvas/SVG layer on `/surveys/[id]` rendering bounding boxes, confidence tags, and shadow analysis overlays with click-to-inspect interactivity.
- [ ] **REQ-T2-02 (Live Pipeline Stepper)**: Visual 6-stage stepper showing async job progress (*Upload $\rightarrow$ Denoise $\rightarrow$ Detect $\rightarrow$ Uncertainty $\rightarrow$ Geotag $\rightarrow$ Ready*).
- [ ] **REQ-T2-03 (Dual Telemetry Badging)**: Display `GeoBadge` distinguishing `Measured GPS` vs `Estimated Anchor`, and `RiskBadge` with explicit text labels (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
- [ ] **REQ-T2-04 (Survey Ingestion & Configuration)**: Drag-and-drop file upload on `/surveys/new` with vehicle speed, sonar altitude, and GPS anchor inputs.
- [ ] **REQ-T2-05 (Mission Dashboard & Catalog)**: `/dashboard` KPI strip and `/detections` filterable table with search by class, risk, and confidence.

---

## Tier 3 & 4: Out-of-Scope / Future Scope Pitch Items (Not in Demo Code)
- Self-supervised contrastive pretraining.
- Physics-informed synthetic sonar generation (GANs).
- Eco-optimized vessel retrieval route planner (V2 future milestone).
- Multi-vessel federated learning network.
