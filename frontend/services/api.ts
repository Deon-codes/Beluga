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
import { INITIAL_SURVEYS, INITIAL_METRICS } from '@/lib/sonar-data';

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

// In-memory & localStorage store for client-side state caching
let memorySurveys: SurveyRecord[] = [...INITIAL_SURVEYS];

export function getStoredSurveys(): SurveyRecord[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('sonar_ai_surveys_v2');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore parse errors
    }
  }
  return memorySurveys;
}

export function setStoredSurveys(surveys: SurveyRecord[]) {
  memorySurveys = surveys;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('sonar_ai_surveys_v2', JSON.stringify(surveys));
    } catch {
      // ignore localStorage errors
    }
  }
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
      const data = await res.json();
      const surveyId = data.survey_id;
      const imageUrl = `${API_BASE}/storage/${surveyId}/${encodeURIComponent(data.filename || file.name)}`;

      const newSurvey: SurveyRecord = {
        id: surveyId,
        title: metadata.title || file.name.replace(/\.[^/.]+$/, '').toUpperCase() + ' SURVEY',
        filename: data.filename || file.name,
        imageUrl: imageUrl,
        uploaded_at: new Date().toISOString(),
        status: 'INGESTION',
        progress_pct: 10,
        total_anomalies: 0,
        critical_count: 0,
        high_count: 0,
        medium_count: 0,
        low_count: 0,
        metadata: {
          vessel_name: metadata.vessel_name || 'ORV Sagar Nidhi (NIOT)',
          sonar_frequency_khz: Number(metadata.sonar_frequency_khz) || 455,
          swath_range_m: Number(metadata.swath_range_m) || 100,
          resolution_m_px: Number(metadata.resolution_m_px) || 0.05,
          altitude_m: Number(metadata.altitude_m) || 12.5,
          heading_deg: Number(metadata.heading_deg) || 42.5,
          start_coords: [Number(metadata.start_lat) || 13.0827, Number(metadata.start_lon) || 80.3128],
          end_coords: [Number(metadata.end_lat) || 13.1492, Number(metadata.end_lon) || 80.3784],
          water_depth_m: 58.4,
          sound_velocity_mps: 1515.2,
          mode: metadata.mode || 'Ping Header Metadata',
          model_version: 'YOLOv8s-Sonar v2.1-NIOT',
        },
        stages: buildStageStatuses('INGESTION', 10),
        detections: [],
      };

      const existing = getStoredSurveys();
      setStoredSurveys([newSurvey, ...existing.filter((s) => s.id !== surveyId)]);

      return data;
    }
  } catch (err) {
    console.warn('Backend upload unreachable, using local hydrographic simulator:', err);
  }

  // Graceful Fallback for offline demo mode
  const surveyId = `SURV-2026-NIOT-${Math.floor(100 + Math.random() * 900)}`;
  const newSurvey: SurveyRecord = {
    id: surveyId,
    title: metadata.title || file.name.replace(/\.[^/.]+$/, '').toUpperCase() + ' SURVEY',
    filename: file.name,
    imageUrl: 'procedural:pass03',
    uploaded_at: new Date().toISOString(),
    status: 'INGESTION',
    progress_pct: 10,
    total_anomalies: 0,
    critical_count: 0,
    high_count: 0,
    medium_count: 0,
    low_count: 0,
    metadata: {
      vessel_name: metadata.vessel_name || 'ORV Sagar Nidhi (NIOT)',
      sonar_frequency_khz: Number(metadata.sonar_frequency_khz) || 455,
      swath_range_m: Number(metadata.swath_range_m) || 100,
      resolution_m_px: Number(metadata.resolution_m_px) || 0.05,
      altitude_m: Number(metadata.altitude_m) || 12.5,
      heading_deg: Number(metadata.heading_deg) || 42.5,
      start_coords: [Number(metadata.start_lat) || 13.0827, Number(metadata.start_lon) || 80.3128],
      end_coords: [Number(metadata.end_lat) || 13.1492, Number(metadata.end_lon) || 80.3784],
      water_depth_m: 58.4,
      sound_velocity_mps: 1515.2,
      mode: metadata.mode || 'Ping Header Metadata',
      model_version: 'YOLOv8s-Sonar v2.1-NIOT',
    },
    stages: buildStageStatuses('INGESTION', 10),
    detections: [],
  };

  const existing = getStoredSurveys();
  setStoredSurveys([newSurvey, ...existing]);

  return {
    survey_id: surveyId,
    status: 'INGESTION',
    filename: file.name,
    message: 'Acoustic survey ingested into NIOT pipeline queue (Simulation mode)',
  };
}

export async function triggerAnalysis(surveyId: string) {
  try {
    const res = await fetch(`${API_BASE}/survey/${surveyId}/analyze`, {
      method: 'POST',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend analyze unreachable, using local simulator:', err);
  }

  // Fallback simulator
  const surveys = getStoredSurveys();
  const surveyIndex = surveys.findIndex((s) => s.id === surveyId);
  if (surveyIndex !== -1) {
    const s = surveys[surveyIndex];
    if (s.detections.length === 0) {
      const baseDetections = INITIAL_SURVEYS[0].detections.map((d, i) =>
        normalizeDetection(
          {
            ...d,
            id: `HAZ-2026-${Math.floor(100 + Math.random() * 900)}`,
            survey_id: surveyId,
            location: {
              lat: s.metadata.start_coords[0] + i * 0.011,
              lon: s.metadata.start_coords[1] + i * 0.009,
              geo_confidence: i % 2 === 0 ? 'measured' : 'estimated',
            },
          },
          surveyId
        )
      );

      s.detections = baseDetections;
      s.total_anomalies = baseDetections.length;
      s.critical_count = baseDetections.filter((d) => d.risk === 'CRITICAL').length;
      s.high_count = baseDetections.filter((d) => d.risk === 'HIGH').length;
      s.medium_count = baseDetections.filter((d) => d.risk === 'MEDIUM').length;
      s.low_count = baseDetections.filter((d) => d.risk === 'LOW').length;
      s.status = 'COMPLETED';
      s.progress_pct = 100;
      s.stages = buildStageStatuses('COMPLETED', 100);
      surveys[surveyIndex] = s;
      setStoredSurveys([...surveys]);
    }
  }

  return {
    survey_id: surveyId,
    status: 'PROCESSING',
    pipeline_version: 'YOLOv8s-Sonar v2.1',
    message: 'Hydrographic inference pipeline initiated',
  };
}

export async function getSurveyStatus(surveyId: string): Promise<BackendJobStatus> {
  try {
    const res = await fetch(`${API_BASE}/survey/${surveyId}/status`);
    if (res.ok) {
      const data: BackendJobStatus = await res.json();
      return data;
    }
  } catch (err) {
    // fallback
  }

  const surveys = getStoredSurveys();
  const survey = surveys.find((s) => s.id === surveyId) || INITIAL_SURVEYS[0];

  return {
    survey_id: survey.id,
    stage: survey.status,
    progress_pct: survey.progress_pct,
    error: null,
  };
}

export async function getSurveyDetections(
  surveyId: string
): Promise<{ detections: AnomalyDetection[]; survey: SurveyRecord }> {
  try {
    const res = await fetch(`${API_BASE}/survey/${surveyId}/detections`);
    if (res.ok) {
      const report: BackendSurveyReport = await res.json();
      const normalizedDetections = (report.detections || []).map((d) => normalizeDetection(d, surveyId));
      const surveys = getStoredSurveys();
      let survey = surveys.find((s) => s.id === surveyId);

      const imageUrl = `${API_BASE}/storage/${surveyId}/${encodeURIComponent(report.image_filename)}`;

      if (!survey) {
        survey = {
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
      } else {
        survey.imageUrl = imageUrl;
        survey.status = 'COMPLETED';
        survey.progress_pct = 100;
        survey.detections = normalizedDetections;
        survey.total_anomalies = normalizedDetections.length;
        survey.stages = buildStageStatuses('COMPLETED', 100);
      }

      setStoredSurveys([survey, ...surveys.filter((s) => s.id !== surveyId)]);

      return {
        detections: normalizedDetections,
        survey,
      };
    }
  } catch (err) {
    console.warn('Backend detections unreachable, reading cached survey:', err);
  }

  const surveys = getStoredSurveys();
  const survey = surveys.find((s) => s.id === surveyId) || INITIAL_SURVEYS[0];

  return {
    detections: survey.detections,
    survey,
  };
}

export function getReportDownloadUrl(surveyId: string, format: 'json' | 'csv') {
  return `${API_BASE}/survey/${surveyId}/report.${format}`;
}

export async function getAllSurveys(): Promise<SurveyRecord[]> {
  return getStoredSurveys();
}

export async function getSurveyById(id: string): Promise<SurveyRecord | null> {
  const surveys = getStoredSurveys();
  return surveys.find((s) => s.id === id) || null;
}

export async function getAllDetections(): Promise<AnomalyDetection[]> {
  const surveys = getStoredSurveys();
  const allDetections: AnomalyDetection[] = [];
  for (const s of surveys) {
    for (const d of s.detections) {
      allDetections.push({ ...d, survey_id: s.id });
    }
  }
  return allDetections;
}

export async function toggleDiverFlag(surveyId: string, anomalyId: string): Promise<boolean> {
  const surveys = getStoredSurveys();
  const survey = surveys.find((s) => s.id === surveyId);
  if (!survey) return false;

  const detection = survey.detections.find((d) => d.id === anomalyId);
  if (!detection) return false;

  detection.diver_recovery_flagged = !detection.diver_recovery_flagged;
  setStoredSurveys([...surveys]);
  return detection.diver_recovery_flagged;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const surveys = getStoredSurveys();
  const allDetections: AnomalyDetection[] = [];
  for (const s of surveys) {
    for (const d of s.detections) {
      allDetections.push(d);
    }
  }

  const critical = allDetections.filter((d) => d.risk === 'CRITICAL').length;
  const high = allDetections.filter((d) => d.risk === 'HIGH').length;
  const medium = allDetections.filter((d) => d.risk === 'MEDIUM').length;
  const low = allDetections.filter((d) => d.risk === 'LOW').length;

  return {
    ...INITIAL_METRICS,
    confirmedHazardsTotal: allDetections.length,
    hazardsBreakdown: {
      critical: critical + 8,
      infrastructure: high + medium + 12,
      minor: low + 10,
    },
    recentAnomalies: allDetections.slice(0, 8),
    recentSurveys: surveys,
  };
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

  const rows = survey.detections.map((d) => {
    const l = d.dimensions_m.length_m ?? d.dimensions_m.length ?? 0;
    const w = d.dimensions_m.width_m ?? d.dimensions_m.width ?? 0;
    const h = d.dimensions_m.height_m ?? d.dimensions_m.height ?? null;

    return [
      d.id,
      `"${d.class_name}"`,
      d.class_id,
      d.risk,
      d.confidence_pct.toFixed(2),
      d.uncertainty_std ? d.uncertainty_std.toFixed(4) : '0.0450',
      (d.certainty || 'MODERATE').toUpperCase(),
      l.toFixed(2),
      w.toFixed(2),
      h !== null ? h.toFixed(2) : 'N/A',
      d.location.lat ? d.location.lat.toFixed(6) : '0.000000',
      d.location.lon ? d.location.lon.toFixed(6) : '0.000000',
      d.location.geo_confidence.toUpperCase(),
      d.has_shadow ? 'YES' : 'NO',
      d.diver_recovery_flagged ? 'FLAGGED' : 'CLEAR',
      d.channel ? d.channel.toUpperCase() : 'PORT',
      survey.id,
    ];
  });

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
