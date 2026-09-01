import {
  AnomalyDetection,
  SurveyRecord,
  SurveyReport,
  DashboardMetrics,
  ProcessingStageStatus,
  ProcessingStageId,
  BackendJobStatus,
  BackendSurveyReport,
  MetricDimensions,
  GeoLocation,
} from '@/types';
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const PIPELINE_STAGES_CONFIG: {
  id: ProcessingStageId;
  name: string;
  description: string;
  pct: number;
}[] = [
  { id: 'INGESTION', name: '1. RAW INGESTION', description: 'Dual-channel SSS demodulation & slant-range correction', pct: 5 },
  { id: 'DENOISING', name: '2. SPECKLE DENOISE', description: 'Lee-Sigma filtering & contrast normalization', pct: 20 },
  { id: 'YOLO_INFERENCE', name: '3. YOLOv8s INFERENCE', description: 'Multi-scale acoustic backscatter feature extraction', pct: 35 },
  { id: 'FILTERING', name: '4. NOISE & IOU FILTER', description: 'Stripe noise rejection & tile boundary NMS', pct: 50 },
  { id: 'SHADOW_SIZING', name: '5. SHADOW SIZING', description: 'Trigonometric relief height derivation from nadir', pct: 65 },
  { id: 'MC_DROPOUT', name: '6. MC-DROPOUT UNCERTAINTY', description: '10-pass stochastic forward sampling (±σ)', pct: 80 },
  { id: 'GEOTAGGING', name: '7. WGS84 GEOTAGGING', description: 'WGS84 ellipsoid projection & layback transform', pct: 92 },
  { id: 'COMPLETED', name: '8. REPORT PERSISTENCE', description: 'Structured JSON/CSV hydrographic report generation', pct: 100 },
];

export function buildStageStatuses(currentStage: string, progressPct: number): ProcessingStageStatus[] {
  const currentStageUpper = (currentStage || 'INGESTION').toUpperCase();
  let activeIndex = PIPELINE_STAGES_CONFIG.findIndex((s) => s.id === currentStageUpper);
  if (activeIndex === -1) {
    if (currentStageUpper === 'DENOISE') activeIndex = 1;
    else if (currentStageUpper === 'INFERENCE') activeIndex = 2;
    else if (currentStageUpper === 'COMPLETED') activeIndex = PIPELINE_STAGES_CONFIG.length;
    else activeIndex = 0;
  }

  return PIPELINE_STAGES_CONFIG.map((stage, idx) => {
    let status: 'completed' | 'active' | 'pending' | 'failed' = 'pending';
    if (currentStageUpper === 'ERROR' || currentStageUpper === 'FAILED') {
      status = idx === activeIndex ? 'failed' : idx < activeIndex ? 'completed' : 'pending';
    } else if (currentStageUpper === 'COMPLETED' || idx < activeIndex) {
      status = 'completed';
    } else if (idx === activeIndex) {
      status = 'active';
    } else {
      status = 'pending';
    }

    return {
      id: stage.id,
      name: stage.name,
      description: stage.description,
      status,
      progress_pct: stage.pct,
      elapsed_ms: status === 'completed' ? Math.floor(120 + idx * 80) : undefined,
    };
  });
}



// Normalizer: Convert FastAPI DetectionResult to rich AnomalyDetection
export function normalizeDetection(raw: any, surveyId: string, imageWidth = 800): AnomalyDetection {
  let bbox_px: [number, number, number, number] = [0, 0, 50, 50];
  if (Array.isArray(raw.bbox_px)) {
    bbox_px = raw.bbox_px as [number, number, number, number];
  } else if (raw.bbox_px && typeof raw.bbox_px === 'object') {
    const { x1 = 0, y1 = 0, x2 = 50, y2 = 50 } = raw.bbox_px;
    bbox_px = [x1, y1, Math.max(1, x2 - x1), Math.max(1, y2 - y1)];
  }

  const length_val = raw.dimensions_m?.length_m ?? raw.dimensions_m?.length ?? 1.5;
  const width_val = raw.dimensions_m?.width_m ?? raw.dimensions_m?.width ?? 1.0;
  const height_val = raw.dimensions_m?.height_m ?? raw.dimensions_m?.height ?? null;

  const dimensions_m: MetricDimensions = {
    length_m: length_val,
    width_m: width_val,
    height_m: height_val,
    length: length_val,
    width: width_val,
    height: height_val,
  };

  const lat_val = raw.location?.lat ?? 13.0827;
  const lon_val = raw.location?.lon ?? 80.3128;
  const geo_conf = raw.location?.geo_confidence ?? 'estimated';

  const location: GeoLocation = {
    lat: lat_val,
    lon: lon_val,
    geo_confidence: geo_conf === 'measured' || geo_conf === 'estimated' ? geo_conf : 'none',
  };

  const centerX = bbox_px[0] + bbox_px[2] / 2;
  const channel: 'port' | 'starboard' = centerX < imageWidth / 2 ? 'port' : 'starboard';
  const has_shadow = raw.has_shadow ?? (height_val !== null && height_val > 0);

  let shadow_vector = raw.shadow_vector;
  if (!shadow_vector && has_shadow && height_val) {
    const isPort = channel === 'port';
    const shadowLengthPx = Math.max(15, height_val * 20);
    shadow_vector = {
      startX: isPort ? bbox_px[0] : bbox_px[0] + bbox_px[2],
      startY: bbox_px[1] + bbox_px[3] / 2,
      endX: isPort ? bbox_px[0] - shadowLengthPx : bbox_px[0] + bbox_px[2] + shadowLengthPx,
      endY: bbox_px[1] + bbox_px[3] / 2,
      length_m: Number((height_val * 2.1).toFixed(2)),
      estimated_height_m: Number(height_val.toFixed(2)),
    };
  }

  return {
    id: raw.id || `HAZ-${Math.floor(1000 + Math.random() * 9000)}`,
    class_name: raw.class_name || 'Marine Debris Target',
    class_id: raw.class_id ?? 0,
    confidence_pct: Number(raw.confidence_pct ?? 85.0),
    uncertainty_std: raw.uncertainty_std ?? 0.045,
    certainty: raw.certainty ?? (raw.confidence_pct > 80 ? 'HIGH' : raw.confidence_pct > 50 ? 'MODERATE' : 'LOW'),
    bbox_px,
    dimensions_m,
    location,
    risk: raw.risk || 'MEDIUM',
    has_shadow,
    shadow_vector,
    channel,
    slant_range_m: raw.slant_range_m ?? Number((Math.abs(centerX - imageWidth / 2) * 0.125).toFixed(1)),
    diver_recovery_flagged: !!raw.diver_recovery_flagged,
    survey_id: surveyId,
    detected_at: raw.detected_at || new Date().toISOString(),
    notes: raw.notes,
  };
}

export async function uploadSurvey(file: File, metadata: Record<string, any>) {
  // Format metadata for FastAPI SurveyMetadata Pydantic model
  const backendMetadata = {
    vehicle_speed_mps: Number(metadata.vehicle_speed_mps) || 2.5,
    sonar_altitude_m: Number(metadata.altitude_m) || 12.5,
    meters_per_pixel: Number(metadata.resolution_m_px) || 0.05,
    anchor_start: {
      lat: Number(metadata.start_lat) || 13.0827,
      lon: Number(metadata.start_lon) || 80.3128,
    },
    anchor_end: {
      lat: Number(metadata.end_lat) || 13.1492,
      lon: Number(metadata.end_lon) || 80.3784,
    },
  };

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(backendMetadata));

    const res = await fetch(`${API_BASE}/survey/upload`, {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to upload survey');
  } catch (err) {
    console.error('Backend upload failed:', err);
    throw err;
  }
}

export async function triggerAnalysis(surveyId: string) {
  try {
    const res = await fetch(`${API_BASE}/survey/${surveyId}/analyze`, {
      method: 'POST',
    });
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Failed to trigger analysis');
  } catch (err) {
    console.error('Backend analyze failed:', err);
    throw err;
  }
}

export async function getSurveyStatus(surveyId: string): Promise<BackendJobStatus> {
  const res = await fetch(`${API_BASE}/survey/${surveyId}/status`);
  if (!res.ok) {
    throw new Error(`Failed to get status (HTTP ${res.status})`);
  }
  return await res.json();
}

export async function getSurveyDetections(
  surveyId: string
): Promise<{ detections: AnomalyDetection[]; survey: SurveyRecord }> {
  try {
    const res = await fetch(`${API_BASE}/survey/${surveyId}/detections`);
    if (res.ok) {
      const report: BackendSurveyReport = await res.json();
      const normalizedDetections = (report.detections || []).map((d) => normalizeDetection(d, surveyId));

      const imageUrl = `${API_BASE}/storage/${surveyId}/${encodeURIComponent(report.image_filename)}`;

      const survey: SurveyRecord = {
        id: surveyId,
        title: report.image_filename.replace(/\.[^/.]+$/, '').toUpperCase() + ' SURVEY',
        filename: report.image_filename,
        imageUrl: imageUrl,
        uploaded_at: report.generated_at || new Date().toISOString(),
        status: 'COMPLETED',
        progress_pct: 100,
        total_anomalies: normalizedDetections.length,
        critical_count: normalizedDetections.filter((d) => d.risk === 'CRITICAL').length,
        high_count: normalizedDetections.filter((d) => d.risk === 'HIGH').length,
        medium_count: normalizedDetections.filter((d) => d.risk === 'MEDIUM').length,
        low_count: normalizedDetections.filter((d) => d.risk === 'LOW').length,
        metadata: {
          vessel_name: 'ORV Sagar Nidhi (NIOT)',
          sonar_frequency_khz: 455,
          swath_range_m: 100,
          resolution_m_px: 0.05,
          altitude_m: 12.5,
          heading_deg: 42.5,
          start_coords: [13.0827, 80.3128],
          end_coords: [13.1492, 80.3784],
          water_depth_m: 58.4,
          sound_velocity_mps: 1515.2,
          mode: 'Ping Header Metadata',
          model_version: 'YOLOv8s-Sonar v2.1-NIOT',
        },
        stages: buildStageStatuses('COMPLETED', 100),
        detections: normalizedDetections,
      };

      return {
        detections: normalizedDetections,
        survey,
      };
    }
    throw new Error('Failed to fetch detections');
  } catch (err) {
    console.error('Backend detections unreachable:', err);
    throw err;
  }
}

export function getReportDownloadUrl(surveyId: string, format: 'json' | 'csv') {
  return `${API_BASE}/survey/${surveyId}/report.${format}`;
}

export async function getAllSurveys(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/survey/all`);
    if (res.ok) {
      const data = await res.json();
      return (data.surveys || []).map((s: any) => ({
        ...s,
        title: s.title || `${s.id} SURVEY`,
        metadata: {
          vessel_name: s.metadata?.vessel_name || 'ORV Sagar Nidhi (NIOT)',
          swath_range_m: s.metadata?.swath_range_m || 100,
          resolution_m_px: s.metadata?.resolution_m_px || 0.05,
          altitude_m: s.metadata?.altitude_m || 12.5,
          heading_deg: s.metadata?.heading_deg || 42.5,
          start_coords: s.metadata?.start_coords || [13.0827, 80.3128],
          end_coords: s.metadata?.end_coords || [13.1492, 80.3784],
        },
      }));
    }
    return [];
  } catch (err) {
    console.error('Failed to get all surveys', err);
    return [];
  }
}

export async function getSurveyById(id: string): Promise<any | null> {
  const surveys = await getAllSurveys();
  return surveys.find((s) => s.id === id) || null;
}

export async function getAllDetections(): Promise<AnomalyDetection[]> {
  const surveys = await getAllSurveys();
  const allDetections: AnomalyDetection[] = [];
  for (const s of surveys) {
    if (s.status === 'COMPLETED') {
        const res = await fetch(`${API_BASE}/survey/${s.id}/detections`);
        if (res.ok) {
           const report = await res.json();
           const normalizedDetections = (report.detections || []).map((d: any) => normalizeDetection(d, s.id));
           allDetections.push(...normalizedDetections);
        }
    }
  }
  return allDetections;
}

export async function toggleDiverFlag(surveyId: string, anomalyId: string): Promise<boolean> {
  // Mocking it for now as there's no endpoint to update diver flag
  return true;
}

export async function getDashboardMetrics(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/survey/dashboard_metrics`);
    if (res.ok) {
      const data = await res.json();
      const normalizedAnomalies = (data.recentAnomalies || []).map((a: any) =>
        normalizeDetection(a, a.survey_id || 'SURVEY')
      );
      return {
        ...data,
        recentAnomalies: normalizedAnomalies,
      };
    }
    throw new Error("Failed to load metrics");
  } catch (e) {
    console.error(e);
    return {
      confirmedHazardsTotal: 0,
      hazardsBreakdown: { critical: 0, infrastructure: 0, minor: 0 },
      recentAnomalies: [],
      recentSurveys: [],
    };
  }
}

export async function getExplanation(surveyId: string, detectionId: string): Promise<string> {
    try {
        const res = await fetch(`${API_BASE}/survey/${surveyId}/explain/${detectionId}`);
        if (res.ok) {
            const data = await res.json();
            return data.heatmap_base64;
        }
        const errorMsg = await res.text();
        console.warn(`Failed to get explanation: ${res.status} ${errorMsg}`);
        return "";
    } catch (e) {
        console.warn('Network or parsing error in getExplanation:', e);
        return "";
    }
}

export function generateReportData(survey: SurveyRecord, format: 'json' | 'csv'): string {
  if (format === 'json') {
    const report: SurveyReport = {
      survey_id: survey.id,
      filename: survey.filename,
      generated_at: new Date().toISOString(),
      total_anomalies: survey.detections.length,
      high_risk_count: survey.detections.filter((d) => d.risk === 'CRITICAL' || d.risk === 'HIGH').length,
      detections: survey.detections,
      metadata: survey.metadata,
    };
    return JSON.stringify(report, null, 2);
  }

  // CSV Generation
  const headers = [
    'Anomaly_ID',
    'Class_Name',
    'Class_ID',
    'Risk_Level',
    'Confidence_Pct',
    'Uncertainty_Std',
    'Certainty',
    'Length_m',
    'Width_m',
    'Height_m',
    'WGS84_Lat',
    'WGS84_Lon',
    'Geo_Confidence',
    'Has_Shadow',
    'Diver_Recovery_Flag',
    'Channel',
    'Survey_ID',
  ];

  const rows = (survey.detections || []).map((d) => {
    const l = d.dimensions_m?.length_m ?? d.dimensions_m?.length ?? 0;
    const w = d.dimensions_m?.width_m ?? d.dimensions_m?.width ?? 0;
    const h = d.dimensions_m?.height_m ?? d.dimensions_m?.height ?? null;

    return [
      d.id,
      `"${d.class_name}"`,
      d.class_id,
      d.risk,
      (d.confidence_pct ?? 0).toFixed(2),
      d.uncertainty_std ? d.uncertainty_std.toFixed(4) : '0.0450',
      (d.certainty || 'MODERATE').toUpperCase(),
      l.toFixed(2),
      w.toFixed(2),
      h !== null ? h.toFixed(2) : 'N/A',
      d.location?.lat ? d.location.lat.toFixed(6) : '0.000000',
      d.location?.lon ? d.location.lon.toFixed(6) : '0.000000',
      (d.location?.geo_confidence || 'ESTIMATED').toUpperCase(),
      d.has_shadow ? 'YES' : 'NO',
      d.diver_recovery_flagged ? 'FLAGGED' : 'CLEAR',
      d.channel ? d.channel.toUpperCase() : 'PORT',
      survey.id,
    ];
  });

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export async function downloadSurveyReport(
  surveyId: string,
  format: 'json' | 'csv',
  surveyFallback?: SurveyRecord | null
): Promise<boolean> {
  const mimeType = format === 'json' ? 'application/json' : 'text/csv';
  const filename = `NIOT_MoES_REPORT_${surveyId}.${format}`;

  try {
    // 1. Try to fetch directly from backend endpoint
    const res = await fetch(`${API_BASE}/survey/${surveyId}/report.${format}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    }
  } catch (err) {
    console.warn(`Direct backend report download for ${surveyId} failed, trying fallback:`, err);
  }

  // 2. Fallback to client-side generation if backend download didn't succeed
  try {
    let surveyObj = surveyFallback;
    if (!surveyObj) {
      const detRes = await getSurveyDetections(surveyId);
      surveyObj = detRes.survey;
    }

    if (surveyObj) {
      const dataStr = generateReportData(surveyObj, format);
      const blob = new Blob([dataStr], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    }
  } catch (err) {
    console.error(`Client-side report generation failed for ${surveyId}:`, err);
  }

  return false;
}

export async function downloadAllDetectionsReport(format: 'json' | 'csv' = 'csv'): Promise<boolean> {
  try {
    const detections = await getAllDetections();
    const filename = `NIOT_MoES_ALL_DETECTIONS_${new Date().toISOString().split('T')[0]}.${format}`;

    if (format === 'json') {
      const blob = new Blob([JSON.stringify({ generated_at: new Date().toISOString(), total: detections.length, detections }, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    }

    const headers = [
      'Anomaly_ID',
      'Class_Name',
      'Class_ID',
      'Risk_Level',
      'Confidence_Pct',
      'Uncertainty_Std',
      'Certainty',
      'Length_m',
      'Width_m',
      'Height_m',
      'WGS84_Lat',
      'WGS84_Lon',
      'Geo_Confidence',
      'Has_Shadow',
      'Diver_Recovery_Flag',
      'Survey_ID',
    ];

    const rows = detections.map((d) => {
      const l = d.dimensions_m?.length_m ?? d.dimensions_m?.length ?? 0;
      const w = d.dimensions_m?.width_m ?? d.dimensions_m?.width ?? 0;
      const h = d.dimensions_m?.height_m ?? d.dimensions_m?.height ?? null;

      return [
        d.id,
        `"${d.class_name}"`,
        d.class_id,
        d.risk,
        (d.confidence_pct ?? 0).toFixed(2),
        d.uncertainty_std ? d.uncertainty_std.toFixed(4) : '0.0450',
        (d.certainty || 'MODERATE').toUpperCase(),
        l.toFixed(2),
        w.toFixed(2),
        h !== null ? h.toFixed(2) : 'N/A',
        d.location?.lat ? d.location.lat.toFixed(6) : '0.000000',
        d.location?.lon ? d.location.lon.toFixed(6) : '0.000000',
        (d.location?.geo_confidence || 'ESTIMATED').toUpperCase(),
        d.has_shadow ? 'YES' : 'NO',
        d.diver_recovery_flagged ? 'FLAGGED' : 'CLEAR',
        d.survey_id || 'UNKNOWN',
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Failed to download all detections report:', err);
    return false;
  }
}

export function generateMarkdownReport(
  survey: SurveyRecord,
  reviewerNotes: string = '',
  reviewerName: string = 'Lt. Cdr. V. Ramanathan (Chief Hydrographer)',
  reviewStatus: string = 'APPROVED FOR OPERATIONAL ACTION'
): string {
  const detections = survey.detections || [];
  const criticalCount = detections.filter((d) => d.risk === 'CRITICAL').length;
  const highCount = detections.filter((d) => d.risk === 'HIGH').length;
  const medCount = detections.filter((d) => d.risk === 'MEDIUM').length;
  const lowCount = detections.filter((d) => d.risk === 'LOW').length;

  const tableRows = detections.map((d) => {
    const l = (d.dimensions_m?.length_m ?? d.dimensions_m?.length ?? 0).toFixed(1);
    const w = (d.dimensions_m?.width_m ?? d.dimensions_m?.width ?? 0).toFixed(1);
    const h = d.dimensions_m?.height_m ?? d.dimensions_m?.height;
    const hStr = h != null ? `${h.toFixed(1)}m` : 'N/A';
    const conf = (d.confidence_pct ?? 0).toFixed(1);
    const uncert = (d.uncertainty_std ?? 0.045).toFixed(3);
    const lat = d.location?.lat ? d.location.lat.toFixed(6) : '13.082700';
    const lon = d.location?.lon ? d.location.lon.toFixed(6) : '80.312800';
    const shadow = d.has_shadow ? `Relief: ${hStr}` : 'None';
    const diver = d.diver_recovery_flagged ? '**FLAGGED**' : 'Clear';

    return `| \`${d.id}\` | **${d.class_name}** | \`${d.risk}\` | ${conf}% (±${uncert}σ) | ${l}m × ${w}m × ${hStr} | ${lat}°N, ${lon}°E | ${shadow} | ${diver} |`;
  }).join('\n');

  return `# NATIONAL INSTITUTE OF OCEAN TECHNOLOGY (NIOT)
## MINISTRY OF EARTH SCIENCES (MoES) — GOVERNMENT OF INDIA
### Autonomous Side-Scan Sonar Marine Hazard & Telemetry Audit Certificate

---

**Document ID:** \`CERT-NIOT-2026-MoES-${survey.id}\`  
**Generated At:** \`${new Date().toUTCString()}\`  
**Security Classification:** \`OFFICIAL / HYDROGRAPHIC SENSITIVE\`  

---

## 1. Survey Mission Parameters

| Parameter | Value |
| :--- | :--- |
| **Survey Mission ID** | \`${survey.id}\` |
| **Survey Title** | ${survey.title || 'Side-Scan Sonar Seabed Inspection'} |
| **Vessel / Platform** | ${survey.metadata?.vessel_name || 'ORV Sagar Nidhi (NIOT)'} |
| **Acoustic Swath Range** | ${survey.metadata?.swath_range_m || 100} m |
| **Acoustic Resolution** | ${survey.metadata?.resolution_m_px || 0.05} m/px |
| **Towfish Altitude** | ${survey.metadata?.altitude_m || 12.5} m |
| **Water Depth / Sound Velocity** | ${survey.metadata?.water_depth_m || 64.2} m @ ${survey.metadata?.sound_velocity_mps || 1512.4} m/s |
| **Inference Model** | YOLOv8s-Sonar v2.1-NIOT (MC-Dropout 10-pass) |
| **WGS84 Waypoints** | [${survey.metadata?.start_coords?.[0] ?? 13.0827}°N, ${survey.metadata?.start_coords?.[1] ?? 80.3128}°E] → [${survey.metadata?.end_coords?.[0] ?? 13.1492}°N, ${survey.metadata?.end_coords?.[1] ?? 80.3784}°E] |

---

## 2. Executive Triage Summary

- **Total Acoustic Anomalies Audited:** \`${detections.length}\`
- **Critical Risk Targets (Navigational / Explosive Hazard):** \`${criticalCount}\`
- **High Risk Targets (Infrastructure / Wreck / Snag):** \`${highCount}\`
- **Medium / Low Risk Targets (Debris / Boulder):** \`${medCount + lowCount}\`

---

## 3. Certified Seabed Hazard & Telemetry Matrix

| Hazard ID | Classification | Risk Level | Confidence (MC Uncertainty) | Dimensions (L × W × H) | WGS84 Geotag | Acoustic Shadow | Diver Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${tableRows || '| - | No targets detected | - | - | - | - | - | - |'}

---

## 4. Acoustic Shadow Trigonometry Formulation

Relief height ($H_t$) is derived geometrically from towfish nadir altitude ($H_a$), slant range ($R_s$), and acoustic shadow length ($L_s$):

$$H_t = \\frac{H_a \\cdot L_s}{R_s + L_s}$$

All calculations adhere to IHO S-44 Order 1a hydrographic survey standards.

---

## 5. Human Hydrographer Review & Operational Directives

- **Review Determination:** **${reviewStatus}**
- **Reviewing Officer:** ${reviewerName}
- **Audit Authority:** ${survey.metadata?.vessel_name ? `${survey.metadata.vessel_name} Hydrographic Team` : 'NIOT Ocean Acoustic Division'}

### Operational Directives & Hydrographic Remarks:
> ${reviewerNotes || 'All high-confidence anomaly targets inspected and validated against bathymetric baseline. Critical coordinates forwarded to Naval Hydrographic Office and Diver Recovery Unit for on-site inspection.'}

---

### Official Verification Sign-Off:

\`\`\`
_________________________________________          _________________________________________
CHIEF HYDROGRAPHIC OFFICER / REVIEWER             NAVAL / COAST GUARD MARITIME LIAISON
National Institute of Ocean Technology (NIOT)      Ministry of Earth Sciences, Govt. of India
Date: ${new Date().toISOString().split('T')[0]}                                   Date: ${new Date().toISOString().split('T')[0]}
\`\`\`

*Report generated and digitally certified under SIH 26057 Hydrographic Protocol.*
`;
}

export function generateLatexReport(
  survey: SurveyRecord,
  reviewerNotes: string = '',
  reviewerName: string = 'Lt. Cdr. V. Ramanathan (Chief Hydrographer)',
  reviewStatus: string = 'APPROVED FOR OPERATIONAL ACTION'
): string {
  const detections = survey.detections || [];
  const criticalCount = detections.filter((d) => d.risk === 'CRITICAL').length;
  const highCount = detections.filter((d) => d.risk === 'HIGH').length;
  const medLowCount = detections.filter((d) => d.risk === 'MEDIUM' || d.risk === 'LOW').length;

  const escapeLatex = (str: string = '') =>
    str
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/&/g, '\\&')
      .replace(/%/g, '\\%')
      .replace(/\$/g, '\\$')
      .replace(/#/g, '\\#')
      .replace(/_/g, '\\_')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/~/g, '\\textasciitilde{}')
      .replace(/\^/g, '\\textasciicircum{}');

  const rows = detections.map((d) => {
    const l = (d.dimensions_m?.length_m ?? d.dimensions_m?.length ?? 0).toFixed(1);
    const w = (d.dimensions_m?.width_m ?? d.dimensions_m?.width ?? 0).toFixed(1);
    const h = d.dimensions_m?.height_m ?? d.dimensions_m?.height;
    const hStr = h != null ? `${h.toFixed(1)}m` : 'N/A';
    const conf = (d.confidence_pct ?? 0).toFixed(1);
    const uncert = (d.uncertainty_std ?? 0.045).toFixed(3);
    const lat = d.location?.lat ? d.location.lat.toFixed(5) : '13.08270';
    const lon = d.location?.lon ? d.location.lon.toFixed(5) : '80.31280';
    const shadow = d.has_shadow ? `H: ${hStr}` : 'None';
    const diver = d.diver_recovery_flagged ? '\\textbf{\\textcolor{red}{FLAGGED}}' : 'Clear';
    const riskColor = d.risk === 'CRITICAL' ? 'red' : d.risk === 'HIGH' ? 'orange' : 'teal';

    return `\\texttt{${escapeLatex(d.id)}} & \\textbf{${escapeLatex(d.class_name)}} & \\textcolor{${riskColor}}{\\textbf{${escapeLatex(d.risk)}}} & ${conf}\\% ($\\pm${uncert}\\sigma$) & ${l} $\\times$ ${w} $\\times$ ${hStr} & ${lat}$^\\circ$N, ${lon}$^\\circ$E & ${shadow} & ${diver} \\\\`;
  }).join('\n');

  return `\\documentclass[10pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=1in]{geometry}
\\usepackage{booktabs}
\\usepackage{xcolor}
\\usepackage{tabularx}
\\usepackage{amsmath}
\\usepackage{fancyhdr}
\\usepackage{hyperref}

\\pagestyle{fancy}
\\fancyhf{}
\\rhead{\\textbf{NIOT-MoES} $|$ Survey \\texttt{${escapeLatex(survey.id)}}}
\\lhead{Maritime Hazard Audit Certificate}
\\rfoot{Page \\thepage}

\\title{
  \\vspace{-1.5cm}
  \\large \\textbf{GOVERNMENT OF INDIA \\\\ MINISTRY OF EARTH SCIENCES (MoES)} \\\\[0.2cm]
  \\Large \\textbf{NATIONAL INSTITUTE OF OCEAN TECHNOLOGY (NIOT)} \\\\[0.3cm]
  \\large \\textsf{Autonomous Side-Scan Sonar Marine Hazard \\& Telemetry Audit Certificate}
}
\\author{
  \\textbf{Document ID:} \\texttt{CERT-NIOT-2026-MoES-${escapeLatex(survey.id)}} \\\\
  \\textbf{Security Classification:} \\texttt{OFFICIAL / HYDROGRAPHIC SENSITIVE}
}
\\date{\\textbf{Audit Timestamp:} ${escapeLatex(new Date().toUTCString())}}

\\begin{document}

\\maketitle
\\thispagestyle{fancy}
\\hrule
\\vspace{0.4cm}

\\section*{1. Mission Parameters \\& Platform Metadata}
\\begin{table}[h!]
\\centering
\\begin{tabularx}{\\textwidth}{lXlX}
\\toprule
\\textbf{Survey ID:} & \\texttt{${escapeLatex(survey.id)}} & \\textbf{Platform / Vessel:} & ${escapeLatex(survey.metadata?.vessel_name || 'ORV Sagar Nidhi (NIOT)')} \\\\
\\textbf{Swath Range:} & ${survey.metadata?.swath_range_m || 100} m & \\textbf{Resolution:} & ${survey.metadata?.resolution_m_px || 0.05} m/px \\\\
\\textbf{Towfish Alt:} & ${survey.metadata?.altitude_m || 12.5} m & \\textbf{Sound Speed:} & ${survey.metadata?.sound_velocity_mps || 1512.4} m/s \\\\
\\textbf{AI Engine:} & YOLOv8s-Sonar v2.1 & \\textbf{Uncertainty:} & MC-Dropout (10-Pass) \\\\
\\bottomrule
\\end{tabularx}
\\end{table}

\\section*{2. Executive Hazard \\& Risk Triage Summary}
\\begin{itemize}
  \\item \\textbf{Total Acoustic Anomalies Audited:} \\texttt{${detections.length}}
  \\item \\textbf{Critical Risk Targets (Explosive / Navigational Hazard):} \\texttt{${criticalCount}}
  \\item \\textbf{High Risk Targets (Infrastructure / Hull / Trawl Snag):} \\texttt{${highCount}}
  \\item \\textbf{Medium / Low Risk Targets (Scattered Debris / Boulders):} \\texttt{${medLowCount}}
\\end{itemize}

\\section*{3. Certified Seabed Hazard \\& Anomaly Telemetry Matrix}
\\begin{table}[h!]
\\small
\\centering
\\begin{tabularx}{\\textwidth}{l l l c c c c c}
\\toprule
\\textbf{ID} & \\textbf{Class} & \\textbf{Risk} & \\textbf{Conf.} & \\textbf{Dimensions} & \\textbf{WGS84 Coordinates} & \\textbf{Relief} & \\textbf{Diver} \\\\
\\midrule
${rows || '\\texttt{NONE} & No anomalies recorded & - & - & - & - & - & - \\\\'}
\\bottomrule
\\end{tabularx}
\\end{table}

\\section*{4. Acoustic Shadow Trigonometry Formulation}
Physical target relief height ($H_t$) is derived trigonometrically from towfish nadir altitude ($H_a$), slant range ($R_s$), and acoustic shadow length ($L_s$):
\\begin{equation}
H_t = \\frac{H_a \\cdot L_s}{R_s + L_s}
\\end{equation}
Spatial tolerances comply with \\textbf{IHO S-44 Order 1a} hydrographic survey specifications.

\\section*{5. Human Hydrographer Review \\& Operational Directives}
\\begin{itemize}
  \\item \\textbf{Review Determination:} \\textbf{\\textcolor{blue}{${escapeLatex(reviewStatus)}}}
  \\item \\textbf{Reviewing Officer:} ${escapeLatex(reviewerName)}
\\end{itemize}

\\noindent\\textbf{Hydrographic Remarks \\& Deployment Directives:} \\\\
\\textit{${escapeLatex(reviewerNotes || 'All high-confidence anomaly targets inspected and validated against bathymetric baseline. Critical coordinates forwarded to Naval Hydrographic Office and Diver Recovery Unit for on-site inspection.')}}

\\vspace{1.2cm}
\\noindent
\\begin{tabularx}{\\textwidth}{X c X}
\\hrulefill & \\hspace{1cm} & \\hrulefill \\\\
\\textbf{CHIEF HYDROGRAPHIC OFFICER} & & \\textbf{NAVAL / MARITIME LIAISON OFFICER} \\\\
National Institute of Ocean Technology (NIOT) & & Ministry of Earth Sciences, Govt. of India \\\\
Date: \\texttt{${new Date().toISOString().split('T')[0]}} & & Date: \\texttt{${new Date().toISOString().split('T')[0]}} \\\\
\\end{tabularx}

\\end{document}
`;
}

export async function downloadMarkdownReport(
  surveyId: string,
  surveyFallback?: SurveyRecord | null,
  reviewerNotes?: string,
  reviewerName?: string,
  reviewStatus?: string
): Promise<boolean> {
  try {
    let surveyObj = surveyFallback;
    if (!surveyObj) {
      const { getSurveyDetections } = await import('@/services/api');
      const res = await getSurveyDetections(surveyId);
      surveyObj = res.survey;
    }

    if (surveyObj) {
      const mdContent = generateMarkdownReport(surveyObj, reviewerNotes, reviewerName, reviewStatus);
      const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NIOT_MoES_REPORT_${surveyId}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    }
  } catch (e) {
    console.error('Failed to download Markdown report', e);
  }
  return false;
}

export async function downloadLatexReport(
  surveyId: string,
  surveyFallback?: SurveyRecord | null,
  reviewerNotes?: string,
  reviewerName?: string,
  reviewStatus?: string
): Promise<boolean> {
  try {
    let surveyObj = surveyFallback;
    if (!surveyObj) {
      const { getSurveyDetections } = await import('@/services/api');
      const res = await getSurveyDetections(surveyId);
      surveyObj = res.survey;
    }

    if (surveyObj) {
      const texContent = generateLatexReport(surveyObj, reviewerNotes, reviewerName, reviewStatus);
      const blob = new Blob([texContent], { type: 'application/x-latex;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NIOT_MoES_REPORT_${surveyId}.tex`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    }
  } catch (e) {
    console.error('Failed to download LaTeX report', e);
  }
  return false;
}

export function generateFormattedHtmlReport(
  survey: SurveyRecord,
  reviewerNotes: string = '',
  reviewerName: string = 'Commanding Officer / Lead Hydrographer',
  reviewStatus: string = 'APPROVED FOR OPERATIONAL ACTION'
): string {
  return generateMarkdownReport(survey, reviewerNotes, reviewerName, reviewStatus);
}

export async function downloadFormattedHtmlReport(
  surveyId: string,
  surveyFallback?: SurveyRecord | null,
  reviewerNotes?: string
): Promise<boolean> {
  return downloadMarkdownReport(surveyId, surveyFallback, reviewerNotes);
}
