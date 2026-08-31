# Implementation Roadmap — SONAR-AI (SIH Problem Statement 26057)

## Phase 1: Backend Foundation & YOLOv8s Inference Engine
**Goal:** Establish FastAPI app structure, Pydantic data contracts, model loader for `models/model_a_unified_v2.pt`, and basic detection pipeline.

### Tasks:
- [x] **Task 1.1**: Define strict Pydantic v2 schemas (`backend/app/models/schemas.py`) for Survey Ingestion, Bounding Box, Detections, Metric Dimensions, Geotags, and Report structures.
- [x] **Task 1.2**: Implement `backend/app/pipeline/detect.py` wrapping Ultralytics YOLOv8s with CUDA/CPU fallback, confidence thresholding, and class name mapping for all 17 classes.
- [x] **Task 1.3**: Implement `backend/app/routers/survey.py` for `/survey/upload` and `/survey/{id}/analyze` with in-memory task status storage.
- [x] **Task 1.4**: Configure `backend/app/main.py` with CORS (`http://localhost:3000`), static storage mounting, and health check.
- [x] **Task 1.5**: Validate raw model inference against a sample sonar image.

---

## Phase 2: Hydrographic Analytics & Intelligence Modules
**Goal:** Implement the physical hydrographic calculations required by the PS that the raw model does not provide on its own.

### Tasks:
- [x] **Task 2.1 (Geotagging Engine)**: Implement `backend/app/pipeline/geotag.py` with along-track ping traversal, across-track geodesic projection (WGS84 math), and dual-anchor interpolation fallback (`geo_confidence: "measured" | "estimated"`).
- [x] **Task 2.2 (Shadow Height & Sizing)**: Implement `backend/app/pipeline/shadow_size.py` to segment acoustic shadows behind bounding boxes and calculate real height $H \approx \frac{L_s \times A}{R_s + L_s}$ plus footprint length & width in meters.
- [x] **Task 2.3 (Uncertainty Scoring)**: Implement `backend/app/pipeline/uncertainty.py` using 15-pass Monte Carlo Dropout returning mean confidence % and standard deviation ($\sigma$) certainty bands (`HIGH`, `MODERATE`, `LOW`).
- [x] **Task 2.4 (False-Positive & Noise Filter)**: Implement `backend/app/pipeline/filter.py` with aspect ratio bounding, shadow presence verification, and tile overlap IoU duplicate suppression.

---

## Phase 3: Reporting, Persistence & Asynchronous Task Worker
**Goal:** Complete the data persistence, background processing stepper, and structured export pipeline.

### Tasks:
- [x] **Task 3.1**: Implement FastAPI `BackgroundTasks` workflow to transition jobs through stages: `INGESTION` $\rightarrow$ `DENOISING` $\rightarrow$ `YOLO_INFERENCE` $\rightarrow$ `FILTERING` $\rightarrow$ `SHADOW_SIZING` $\rightarrow$ `MC_DROPOUT` $\rightarrow$ `GEOTAGGING` $\rightarrow$ `COMPLETED`.
- [x] **Task 3.2**: Implement `backend/app/routers/report.py` exposing downloadable `/survey/{id}/report.json` and tabular `/survey/{id}/report.csv`.
- [x] **Task 3.3**: Expose `/survey/{id}/status` and `/survey/{id}/detections` endpoints returning full structured JSON matching the UI contract, with disk persistence and lifespan cache recovery.
- [x] **Task 3.4**: Write unit verification test simulating the entire survey processing lifecycle (`test_lifecycle.py`).

---

## Phase 4: Frontend Command Center Core (Next.js 15 + Tailwind CSS 4)
**Goal:** Build the mission-critical sonar ingestion interface and interactive dual-viewport analysis screen.

### Tasks:
- [x] **Task 4.1**: Set up Next.js App Router project with Tailwind CSS 4 theme tokens (`--color-abyss`, `--color-deep-navy`, `--color-panel`, `--color-cyan`, tabular-nums, tactical animations).
- [x] **Task 4.2**: Implement typed API client (`frontend/services/api.ts`) interfacing with all FastAPI endpoints with automatic fallback.
- [x] **Task 4.3**: Build `SonarImageViewer.tsx` HTML5 Canvas component:
  - Bounding box rendering with class-coded colors and corner reticles.
  - Acoustic shadow vector projection lines & trigonometric relief derivations.
  - Real scan image loading (`imageUrl`) from static FastAPI storage + procedural fallback.
  - Interactive distance measurement ruler, pan/zoom, channel mode split, and colormaps.
- [x] **Task 4.4**: Build `ProcessingStepper.tsx` (8-stage pipeline), `ConfidenceMeter.tsx` (mean % + $\pm\sigma$ band), `GeoBadge.tsx` (measured vs estimated), and `RiskBadge.tsx`.
- [x] **Task 4.5**: Implement `/surveys/new` (upload dropzone + nav metadata form) and `/surveys/[id]` (interactive analysis console with live 1.5s polling).

---

## Phase 5: Extended Mission Suite & Fleet Analytics Dashboard
**Goal:** Build global telemetry, multi-survey catalog, and compliance export center.

### Tasks:
- [x] **Task 5.1**: Build `/dashboard` featuring Mission KPI counters (Total KM² scanned, hazards detected, high-risk ghost nets, avg certainty score), recent missions feed, and interactive seabed anomaly bathymetric map.
- [x] **Task 5.2**: Build `/detections` global hazard catalog with multi-column filtering (Class, Risk level, Certainty, Date) and direct deep-link to survey inspect view.
- [x] **Task 5.3**: Build `/reports` center with formatted print/preview cards and one-click JSON/CSV download actions.
- [x] **Task 5.4**: Add dark mode oceanographic UI polish, telemetry tooltips, and responsive layout guards in `ShellLayout.tsx`.

---

## Phase 6: Edge Optimization Profiling, Simulation & Demo Dry-Run
**Goal:** Prepare live demonstration assets, edge performance numbers, and defensive pitch talking points for the SIH evaluators.

### Tasks:
- [x] **Task 6.1**: Run ONNX INT8 model quantization export benchmark script (`scripts/export_edge.py`) to generate edge latency & size reduction metrics (FP32 vs INT8) for presentation slides.
- [x] **Task 6.2**: Package sample sonar test scans with mock navigation headers for instant live demonstration.
- [x] **Task 6.3**: Perform complete end-to-end integration test (Upload $\rightarrow$ Stepper $\rightarrow$ Canvas Bounding Boxes $\rightarrow$ Geotags $\rightarrow$ CSV/JSON Export).
- [x] **Task 6.4**: Document live demo runbook and pitch defense points (addressing 17 classes, GPS interpolation honesty, and edge drone readiness).
