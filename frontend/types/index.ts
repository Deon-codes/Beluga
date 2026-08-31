export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type GeoConfidence = 'measured' | 'estimated' | 'none';
export type CertaintyLevel = 'HIGH' | 'MODERATE' | 'LOW' | 'high' | 'moderate' | 'low';
export type ProcessingStageId =
  | 'INGESTION'
  | 'DENOISING'
  | 'DENOISE'
  | 'YOLO_INFERENCE'
  | 'INFERENCE'
  | 'FILTERING'
  | 'SHADOW_SIZING'
  | 'MC_DROPOUT'
  | 'GEOTAGGING'
  | 'COMPLETED'
  | 'ERROR'
  | 'FAILED';

export interface BoundingBoxPx {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface MetricDimensions {
  length_m?: number | null;
  width_m?: number | null;
  height_m?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
}

export interface GeoLocation {
  lat?: number | null;
  lon?: number | null;
  geo_confidence: GeoConfidence;
}

export interface AnomalyDetection {
  id: string;
  class_name: string;
  class_id: number;
  confidence_pct: number;
  uncertainty_std?: number | null;
  certainty?: CertaintyLevel | null;
  bbox_px: [number, number, number, number] | BoundingBoxPx; // [x, y, width, height] or { x1, y1, x2, y2 }
  dimensions_m: MetricDimensions;
  location: GeoLocation;
  risk: RiskLevel;
  has_shadow?: boolean;
  shadow_vector?: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    length_m: number;
    estimated_height_m: number;
  };
  channel?: 'port' | 'starboard';
  ping_index?: number;
  slant_range_m?: number;
  diver_recovery_flagged?: boolean;
  survey_id?: string;
  detected_at?: string;
  notes?: string;
}

export interface BackendSurveyReport {
  survey_id: string;
  generated_at: string;
  image_filename: string;
  detections: AnomalyDetection[];
  processing_stage: string;
}

export interface BackendJobStatus {
  survey_id: string;
  stage: string;
  progress_pct: number;
  error?: string | null;
}

export interface SurveyMetadata {
  vessel_name?: string;
  sonar_frequency_khz?: number;
  swath_range_m: number;
  resolution_m_px: number;
  altitude_m: number;
  heading_deg: number;
  start_coords: [number, number];
  end_coords: [number, number];
  area_coverage_km2?: number;
  water_depth_m?: number;
  sound_velocity_mps?: number;
  vehicle_speed_mps?: number;
  mode?: 'Interpolated Waypoints (Demo Fallback)' | 'Ping Header Metadata';
  model_version?: string;
}

export interface ProcessingStageStatus {
  id: ProcessingStageId;
  name: string;
  description: string;
  status: 'completed' | 'active' | 'pending' | 'failed';
  elapsed_ms?: number;
  progress_pct?: number;
}

export interface SurveyRecord {
  id: string;
  title: string;
  filename: string;
  imageUrl: string;
  uploaded_at: string;
  status: 'PENDING' | 'INGESTION' | 'DENOISING' | 'INFERENCE' | 'FILTERING' | 'SHADOW_SIZING' | 'MC_DROPOUT' | 'GEOTAGGING' | 'COMPLETED' | 'FAILED' | 'ERROR';
  progress_pct: number;
  total_anomalies: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  metadata: SurveyMetadata;
  detections: AnomalyDetection[];
  stages: ProcessingStageStatus[];
}

export interface SurveyReport {
  survey_id: string;
  filename: string;
  generated_at: string;
  total_anomalies: number;
  high_risk_count: number;
  detections: AnomalyDetection[];
  metadata?: SurveyMetadata;
  image_filename?: string;
  processing_stage?: string;
}

export interface DashboardMetrics {
  totalSeabedScannedKm2: number;
  scanRateSparkline: number[];
  confirmedHazardsTotal: number;
  hazardsBreakdown: {
    critical: number;
    infrastructure: number;
    minor: number;
  };
  modelConfidenceAvg: number;
  modelConfidenceStd: number;
  ghostNetClusters: number;
  recentAnomalies: AnomalyDetection[];
  recentSurveys: SurveyRecord[];
}
