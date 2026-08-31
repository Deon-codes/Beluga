# SONAR-AI — AI-Powered Automated Underwater Marine Debris and Anomaly Detection System

**SIH Problem Statement ID:** 26057  
**Organization:** Ministry of Earth Sciences (MoES) / National Institute of Ocean Technology (NIOT)  
**Category:** Software | **Theme:** Disaster Management  

---

## 1. Executive Summary & Backstory

Abandoned, lost, or discarded fishing gear ("ghost nets") and anthropogenic debris trap marine life, destroy coral reefs, and damage vessel propulsion systems. Ocean conservationists and hydrographic surveyors rely on Side-Scan Sonar (SSS) instruments towed behind survey ships or Autonomous Underwater Vehicles (AUVs) to map the seafloor acoustically.

Manual inspection of thousands of kilometers of acoustic logs is slow, fatigue-prone, and struggles to distinguish debris from natural rock ridges, sand ripples, and acoustic shadows. **SONAR-AI** automates the entire computer vision and hydrographic analytics workflow:
1. Ingests raw Side-Scan Sonar imagery / tile strips.
2. Identifies 17 classes of underwater hazards using a fine-tuned YOLOv8s detector.
3. Computes uncertainty-aware confidence scores using Monte Carlo Dropout.
4. Performs shadow-based geometric height and footprint estimation in physical meters.
5. Projects seabed pixel coordinates into real-world WGS84 Geotags (Latitude/Longitude).
6. Applies acoustic noise and rock-cluster false positive suppression.
7. Generates NIOT-compliant structured anomaly reports in JSON and CSV formats.
8. Presents a dark-mode oceanographic Command Center UI (Next.js 16 + Tailwind CSS 4) with interactive canvas overlays.

---

## 2. Core Technical Architecture

### 2.1 Backend (FastAPI Service)
* **Inference Engine**: Ultralytics YOLOv8s (`models/model_a_unified_v2.pt`, 17 classes: Pipeline, Aircraft, Fish, Other, Shipwreck, MILCO, NOMBO, Tire, Bottle, Drink-carton, Chain, Can, Valve, Propeller, Hook, Shampoo-bottle, Standing-bottle).
* **Uncertainty Estimator (`uncertainty.py`)**: 15-pass Monte Carlo Dropout returning mean confidence % and standard deviation certainty bands (`HIGH`, `MODERATE`, `LOW`).
* **Acoustic Shadow Sizer (`shadow_size.py`)**: Extracts shadow length $L_s$ behind detections and calculates object vertical elevation:
  $$H \approx \frac{L_s \times \text{Altitude}}{\text{Slant Range} + L_s}$$
  along with footprint length and width in meters.
* **Geotagging Engine (`geotag.py`)**: Transforms $(x, y)$ pixels into WGS84 coordinates via along-track ping trajectory & across-track geodesic projection, with two-point anchor interpolation fallback (`geo_confidence: "measured" | "estimated"`).
* **False Positive Filter (`filter.py`)**: Morphological aspect ratio check + down-range shadow presence validation to eliminate false rock alarms.
* **Report Exporter (`report.py`)**: Generates structured `.json` and `.csv` inspection logs.

### 2.2 Frontend (Next.js 16 + Tailwind CSS 4)
* **Design Theme**: Dark oceanographic telemetry (`--color-abyss: #05070d`, `--color-deep-navy: #0b1220`, `--color-cyan: #22d3ee`, tabular numerals).
* **Routes**:
  - `/dashboard`: Mission KPI counters, active alerts, regional anomaly map overview.
  - `/surveys/new`: Sonar log uploader + survey trajectory parameter inputs.
  - `/surveys/[id]`: Dual-pane analysis console with interactive canvas viewport, live step-by-step processing stepper, and detection metadata inspector.
  - `/detections`: Global filterable catalog of all detected seafloor hazards.
  - `/reports`: Live document preview & one-click download of JSON / CSV logs.

---

## 3. Milestones & Delivery Status

| Milestone | Scope | Status |
|---|---|---|
| **M1: Model Training** | YOLOv8s 17-class merged underwater dataset training | ✅ Completed (`mAP50: 0.832`) |
| **M2: Architecture & Specs** | PRD, Backend Spec, Frontend Spec, Repo integration | ✅ Completed |
| **M3: Backend API** | FastAPI, YOLO inference, MC-Dropout, Geotag, Shadow sizing, Reporting | 🟡 In Progress |
| **M4: Frontend UI** | Next.js 16, Canvas overlay, Processing Stepper, Analysis console | 🟡 Next |
| **M5: Integration & Demo** | End-to-end testing with sample sonar scans for SIH internal round | ⚪ Planned |
