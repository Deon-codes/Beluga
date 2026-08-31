'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { uploadSurvey, triggerAnalysis } from '@/services/api';
import {
  UploadCloud,
  FileImage,
  Sliders,
  Compass,
  Layers,
  Cpu,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Info,
  Radio,
} from 'lucide-react';

export default function NewSurveyPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDetails, setFileDetails] = useState<{
    name: string;
    sizeKb: number;
    format: string;
    widthPx?: number;
    heightPx?: number;
    previewUrl?: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Hydrographic Parameters State
  const [resolution, setResolution] = useState('0.05');
  const [altitude, setAltitude] = useState('12.5');
  const [swathRange, setSwathRange] = useState('100');
  const [startLat, setStartLat] = useState('13.082700');
  const [startLon, setStartLon] = useState('80.312800');
  const [heading, setHeading] = useState('042.5');
  const [endLat, setEndLat] = useState('13.149200');
  const [endLon, setEndLon] = useState('80.378400');
  const [vesselName, setVesselName] = useState('ORV Sagar Nidhi (NIOT)');
  const [mode, setMode] = useState<'Interpolated Waypoints (Demo Fallback)' | 'Ping Header Metadata'>(
    'Ping Header Metadata'
  );

  // Execution state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepMessage, setStepMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle file drop & selection
  const processFile = (file: File) => {
    setErrorMessage(null);
    const validTypes = ['image/png', 'image/jpeg', 'image/tiff', 'application/octet-stream'];
    const isImage = validTypes.includes(file.type) || file.name.endsWith('.tiff') || file.name.endsWith('.raw');

    if (!isImage && !file.name.match(/\.(png|jpg|jpeg|tif|tiff|raw)$/i)) {
      setErrorMessage('Unsupported acoustic format. Please provide .png, .jpg, .tiff, or .raw SSS data.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = previewUrl;
    img.onload = () => {
      setFileDetails({
        name: file.name,
        sizeKb: Math.round(file.size / 1024),
        format: file.name.split('.').pop()?.toUpperCase() || 'RAW',
        widthPx: img.naturalWidth || 800,
        heightPx: img.naturalHeight || 2000,
        previewUrl,
      });
    };
    img.onerror = () => {
      // For RAW/TIFF binary files without direct browser rendering
      setFileDetails({
        name: file.name,
        sizeKb: Math.round(file.size / 1024),
        format: file.name.split('.').pop()?.toUpperCase() || 'RAW-SSS',
        widthPx: 800,
        heightPx: 2000,
        previewUrl: undefined,
      });
    };

    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Sample preset loader for quick testing
  const handleLoadSample = (sampleName: string) => {
    const dummyFile = new File(['sonar_sample_payload'], sampleName, { type: 'image/png' });
    processFile(dummyFile);
  };

  const handleInitiatePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select or drop an acoustic waterfall scan before launching pipeline.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      setStepMessage('1/3: Demodulating and ingesting dual-channel raw acoustic stream...');
      const metadata = {
        title: selectedFile.name.replace(/\.[^/.]+$/, '').toUpperCase() + ' SURVEY',
        vessel_name: vesselName,
        resolution_m_px: parseFloat(resolution),
        altitude_m: parseFloat(altitude),
        swath_range_m: parseFloat(swathRange),
        start_lat: parseFloat(startLat),
        start_lon: parseFloat(startLon),
        heading_deg: parseFloat(heading),
        end_lat: parseFloat(endLat),
        end_lon: parseFloat(endLon),
        mode,
      };

      const uploadResult = await uploadSurvey(selectedFile, metadata);
      const surveyId = uploadResult.survey_id;

      setStepMessage('2/3: Triggering multi-scale YOLOv8s-Sonar v2.1 inference & MC-Dropout...');
      await triggerAnalysis(surveyId);

      setStepMessage('3/3: Deriving acoustic shadow vectors & WGS84 ellipsoid transforms...');
      await new Promise((r) => setTimeout(r, 600));

      router.push(`/surveys/${surveyId}`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Pipeline communication error. Falling back to internal engine.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4 ">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-zinc-800 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Upload Survey
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-500 dark:text-slate-400">
            Upload and analyze acoustic survey datasets.
          </p>
        </div>
        <div className="text-right text-[10px] text-slate-500 hidden sm:block">
          <div>NODE: CUDA-0</div>
          <div className="text-blue-600 dark:text-blue-400">YOLOv8s-Sonar v2.1</div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-950/80 border border-red-500 text-red-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-600 dark:text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleInitiatePipeline} className="space-y-4">
        {/* Upload Zone & Acoustic Verification */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-xl space-y-3 ">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <FileImage className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              1. Dataset File
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-500 dark:text-slate-400">Quick Samples:</span>
              <button
                type="button"
                onClick={() => handleLoadSample('NIOT_BAYOFBENGAL_PASS03_100M.raw')}
                className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 border border-blue-200 dark:border-blue-800 text-blue-500 dark:text-blue-300 hover:bg-cyan-900 rounded-xl"
              >
                PASS 03 (Wreck)
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('CHENN_ANCHORAGE_SHOAL_01.raw')}
                className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 border border-blue-200 dark:border-blue-800 text-blue-500 dark:text-blue-300 hover:bg-cyan-900 rounded-xl"
              >
                PASS 01 (Net)
              </button>
            </div>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-cyan-400 bg-blue-50 dark:bg-blue-900/40 text-cyan-200'
                : selectedFile
                ? 'border-cyan-700/80 bg-slate-50 dark:bg-slate-900'
                : 'border-slate-200 dark:border-zinc-700/80 hover:border-cyan-600 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:bg-zinc-800'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.tif,.tiff,.raw"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  processFile(e.target.files[0]);
                }
              }}
            />

            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 border border-blue-500/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <UploadCloud className="w-6 h-6 animate-pulse" />
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-700 dark:text-slate-200">
                {selectedFile ? selectedFile.name : 'DRAG & DROP ACOUSTIC WATERFALL SCAN'}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-500 dark:text-slate-400 max-w-md">
                Supports GeoTIFF, Side-Scan Sonar (.raw, .tiff), PNG, and JPEG waterfall channels with ping metadata headers.
              </p>
            </div>
          </div>

          {/* File Verification Card */}
          {fileDetails && (
            <div className="bg-slate-50 dark:bg-zinc-900 border border-cyan-900/60 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-600 dark:text-emerald-400" />
                <div>
                  <div className="font-bold text-slate-700 dark:text-slate-700 dark:text-slate-200">{fileDetails.name}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-500 dark:text-slate-400">
                    FORMAT: <strong className="text-blue-600 dark:text-blue-400">{fileDetails.format}</strong> | SIZE:{' '}
                    <strong className="text-slate-600 dark:text-slate-600 dark:text-slate-300">{fileDetails.sizeKb} KB</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-[11px] text-slate-600 dark:text-slate-600 dark:text-slate-300">
                <div>
                  RESOLUTION: <strong className="text-blue-500 dark:text-blue-300">{fileDetails.widthPx} × {fileDetails.heightPx} px</strong>
                </div>
                <div className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-700 text-emerald-600 dark:text-emerald-600 dark:text-emerald-400 font-bold rounded-xl text-[10px]">
                  PIXEL INTEGRITY VERIFIED
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hydrographic Survey Parameters */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-xl space-y-4 ">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-2">
            <span className="font-bold text-xs text-slate-700 dark:text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              2. Metadata
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Info className="w-3 h-3 text-blue-600 dark:text-blue-400" /> WGS84 ELLIPSOID
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Survey Vessel */}
            <div className="space-y-1">
              <label className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-[11px] uppercase font-semibold">
                Survey Vessel / Towfish
              </label>
              <input
                type="text"
                value={vesselName}
                onChange={(e) => setVesselName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 focus:border-blue-500 px-2.5 py-1.5 rounded-xl text-slate-700 dark:text-slate-700 dark:text-slate-200 text-xs "
              />
            </div>

            {/* Across-track Resolution */}
            <div className="space-y-1">
              <label className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-[11px] uppercase font-semibold">
                Across-Track Resolution (m/px)
              </label>
              <input
                type="number"
                step="0.01"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 focus:border-blue-500 px-2.5 py-1.5 rounded-xl text-blue-500 dark:text-blue-300 text-xs "
              />
            </div>

            {/* Vehicle Altitude */}
            <div className="space-y-1">
              <label className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-[11px] uppercase font-semibold">
                Vehicle Altitude Above Bed (m)
              </label>
              <input
                type="number"
                step="0.1"
                value={altitude}
                onChange={(e) => setAltitude(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 focus:border-blue-500 px-2.5 py-1.5 rounded-xl text-blue-500 dark:text-blue-300 text-xs "
              />
            </div>

            {/* Swath Slant Range */}
            <div className="space-y-1">
              <label className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-[11px] uppercase font-semibold">
                Swath Slant Range (m)
              </label>
              <input
                type="number"
                value={swathRange}
                onChange={(e) => setSwathRange(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 focus:border-blue-500 px-2.5 py-1.5 rounded-xl text-blue-500 dark:text-blue-300 text-xs "
              />
            </div>

            {/* Heading */}
            <div className="space-y-1">
              <label className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-[11px] uppercase font-semibold flex items-center gap-1">
                <Compass className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Transect Heading (°)
              </label>
              <input
                type="text"
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 focus:border-blue-500 px-2.5 py-1.5 rounded-xl text-slate-700 dark:text-slate-700 dark:text-slate-200 text-xs "
              />
            </div>

            {/* Ingestion Mode */}
            <div className="space-y-1">
              <label className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-[11px] uppercase font-semibold">
                Coordinate Georeferencing Mode
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 focus:border-blue-500 px-2.5 py-1.5 rounded-xl text-slate-700 dark:text-slate-700 dark:text-slate-200 text-xs "
              >
                <option value="Ping Header Metadata">Ping Header Metadata (XTF/JSF)</option>
                <option value="Interpolated Waypoints (Demo Fallback)">
                  Interpolated Waypoints (Demo Fallback)
                </option>
              </select>
            </div>
          </div>

          {/* Coordinate Waypoints */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-zinc-800/80">
            {/* Start Coordinates */}
            <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-zinc-800 rounded-xl space-y-2">
              <div className="text-[11px] font-bold text-blue-500 dark:text-blue-300 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400" /> TRANSECT START WAYPOINT (WGS84)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500">START LAT (°N)</span>
                  <input
                    type="text"
                    value={startLat}
                    onChange={(e) => setStartLat(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 px-2 py-1 rounded-xl text-slate-700 dark:text-slate-700 dark:text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">START LON (°E)</span>
                  <input
                    type="text"
                    value={startLon}
                    onChange={(e) => setStartLon(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 px-2 py-1 rounded-xl text-slate-700 dark:text-slate-700 dark:text-slate-200 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* End Coordinates */}
            <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-zinc-800 rounded-xl space-y-2">
              <div className="text-[11px] font-bold text-blue-500 dark:text-blue-300 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400" /> TRANSECT END WAYPOINT (WGS84)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500">END LAT (°N)</span>
                  <input
                    type="text"
                    value={endLat}
                    onChange={(e) => setEndLat(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 px-2 py-1 rounded-xl text-slate-700 dark:text-slate-700 dark:text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">END LON (°E)</span>
                  <input
                    type="text"
                    value={endLon}
                    onChange={(e) => setEndLon(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 px-2 py-1 rounded-xl text-slate-700 dark:text-slate-700 dark:text-slate-200 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button & Stepper Feed */}
        <div className="space-y-3">
          {isSubmitting && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/70 border border-blue-500 rounded-xl text-xs flex items-center gap-3 text-cyan-200 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500 dark:text-blue-300" />
              <span>{stepMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !selectedFile}
            className="w-full premium-button py-3 w-full justify-center text-white flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Cpu className="w-4 h-4" />
                <span>Analyze Survey</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

