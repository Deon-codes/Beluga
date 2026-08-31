# Live Demo Runbook and Pitch Defense

## Execution Steps

1. **Start the API Server**:
   ```bash
   cd backend
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
2. **Start the Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
3. **Run the Demonstration**:
   - Open the web application at `http://localhost:3000`.
   - Go to **New Survey** (`/surveys/new`).
   - Drag and drop a sample image from the `demo_data/` folder.
   - Inject the mock navigation data from `demo_data/demo_nav.json`.
   - Start the processing pipeline and show the **Processing Stepper** moving through the 8 stages (Ingestion $\rightarrow$ Denoising $\rightarrow$ YOLO Inference $\rightarrow$ Filtering $\rightarrow$ Shadow Sizing $\rightarrow$ MC Dropout $\rightarrow$ Geotagging $\rightarrow$ Completed).
   - Once completed, open the **Interactive Analysis Console** to show the bounding boxes on the HTML5 canvas.
   - Point out the `ConfidenceMeter` and `GeoBadge` showing real-time metrics.
   - Go to **Reports** and generate a CSV and JSON export for compliance checking.

## Pitch Defense Points

### 1. 17-Class Taxonomy Justification
- **Question**: Why 17 classes instead of a generic "anomaly" detector?
- **Defense**: Marine debris and hazards require nuanced categorization for actionable intelligence. Differentiating between "MILCO" (Mine-like contact) and "Tire" (Debris) fundamentally changes the response strategy from explosive ordnance disposal (EOD) to environmental cleanup. The 17 classes cover critical infrastructure (Pipelines), wrecks, and various debris types, making the system viable for real-world MoES/NIOT operations.

### 2. GPS Interpolation Honesty
- **Question**: How accurate is the geotagging if the sonar ping lacks direct GPS data?
- **Defense**: We use a dual-anchor interpolation fallback. If direct coordinates are missing, we calculate the along-track traversal using WGS84 math between known waypoints, and the across-track geodesic projection. The UI honestly reflects this via the `GeoBadge`, which labels positions as either `measured` (high confidence) or `estimated` (interpolated), ensuring operators are aware of spatial uncertainty.

### 3. Edge Drone Readiness
- **Question**: Can this run on autonomous underwater vehicles (AUVs) with limited compute?
- **Defense**: Yes. By exporting our YOLOv8s model to ONNX INT8 (`export_edge.py`), we achieve significant size reduction (approx. 4x smaller) and CPU inference speedups without substantial accuracy loss. The decoupled architecture (FastAPI backend) means the inference engine can be deployed directly on the AUV's edge compute (e.g., NVIDIA Jetson or Raspberry Pi) while the frontend acts as a remote command center.

### 4. Robustness via MC Dropout (Uncertainty Scoring)
- **Question**: How do you prevent false positives?
- **Defense**: Beyond standard confidence thresholding, we implemented a 15-pass Monte Carlo Dropout pipeline. This yields a standard deviation ($\sigma$) of the predictions, giving us a "certainty band." If the model is confident but highly uncertain, the `RiskBadge` and filter flag it for human review, dramatically reducing actionable false positives.
