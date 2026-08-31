'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AnomalyDetection } from '@/types';
import { drawSonarWaterfall, WaterfallOptions } from '@/lib/sonar-generator';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  EyeOff,
  Layers,
  Ruler,
  Camera,
  Split,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface SonarImageViewerProps {
  detections: AnomalyDetection[];
  selectedDetectionId?: string | null;
  onSelectDetection?: (detection: AnomalyDetection) => void;
  surveyTitle?: string;
  swathRangeM?: number;
  resolutionMPerPx?: number;
  preset?: 'pass01' | 'pass02' | 'pass03' | 'default';
  imageUrl?: string;
  className?: string;
}

export function SonarImageViewer({
  detections,
  selectedDetectionId,
  onSelectDetection,
  surveyTitle = 'Acoustic Waterfall Scan',
  swathRangeM = 100,
  resolutionMPerPx = 0.05,
  preset = 'pass03',
  imageUrl,
  className = '',
}: SonarImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const realImageRef = useRef<HTMLImageElement | null>(null);

  // Dimensions of acoustic waterfall buffer
  const [virtualDims, setVirtualDims] = useState<{ width: number; height: number }>({
    width: 800,
    height: 2000,
  });

  // Viewport transformation state
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Toggles and modes
  const [showBoxes, setShowBoxes] = useState<boolean>(true);
  const [showShadows, setShowShadows] = useState<boolean>(true);
  const [colormap, setColormap] = useState<WaterfallOptions['colormap']>('sonar-amber');
  const [channelMode, setChannelMode] = useState<'split' | 'port' | 'starboard'>('split');
  const [rulerActive, setRulerActive] = useState<boolean>(false);
  const [rulerPoints, setRulerPoints] = useState<{
    start: { x: number; y: number } | null;
    end: { x: number; y: number } | null;
  }>({
    start: null,
    end: null,
  });

  // Cursor Telemetry tracking
  const [cursorTelemetry, setCursorTelemetry] = useState<{
    xPx: number;
    yPx: number;
    slantRangeM: number;
    channel: 'PORT' | 'STARBOARD' | 'NADIR';
    pingIndex: number;
  } | null>(null);

  // Helper to extract [x, y, w, h] from either tuple or BoundingBox object
  const getBoxCoords = useCallback((det: AnomalyDetection): [number, number, number, number] => {
    if (Array.isArray(det.bbox_px)) {
      return det.bbox_px;
    }
    if (det.bbox_px && typeof det.bbox_px === 'object') {
      const b: any = det.bbox_px;
      const x1 = b.x1 ?? 0;
      const y1 = b.y1 ?? 0;
      const x2 = b.x2 ?? 50;
      const y2 = b.y2 ?? 50;
      return [x1, y1, Math.max(1, x2 - x1), Math.max(1, y2 - y1)];
    }
    return [0, 0, 50, 50];
  }, []);

  // Helper to resolve shadow vector
  const getShadowVector = useCallback(
    (det: AnomalyDetection) => {
      if (det.shadow_vector) return det.shadow_vector;
      const height = det.dimensions_m?.height_m ?? det.dimensions_m?.height;
      if (det.has_shadow && height && height > 0) {
        const [bx, by, bw, bh] = getBoxCoords(det);
        const isPort = bx + bw / 2 < virtualDims.width / 2;
        const shadowLengthPx = Math.max(15, height * 20);
        return {
          startX: isPort ? bx : bx + bw,
          startY: by + bh / 2,
          endX: isPort ? bx - shadowLengthPx : bx + bw + shadowLengthPx,
          endY: by + bh / 2,
          length_m: Number((height * 2.1).toFixed(2)),
          estimated_height_m: Number(height.toFixed(2)),
        };
      }
      return null;
    },
    [getBoxCoords, virtualDims.width]
  );

  // Load Real Image if URL provided
  useEffect(() => {
    if (!imageUrl || imageUrl.startsWith('procedural:')) {
      realImageRef.current = null;
      setVirtualDims({ width: 800, height: 2000 });
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      realImageRef.current = img;
      setVirtualDims({
        width: img.naturalWidth || 800,
        height: img.naturalHeight || 2000,
      });
    };
    img.onerror = () => {
      console.warn('Could not load real image from', imageUrl, '— falling back to procedural waterfall.');
      realImageRef.current = null;
      setVirtualDims({ width: 800, height: 2000 });
    };
  }, [imageUrl]);

  // Generate / Cache offscreen acoustic image on canvas (when using procedural waterfall)
  const renderAcousticTexture = useCallback(() => {
    if (realImageRef.current) return; // Skip procedural if real image loaded

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    const off = offscreenCanvasRef.current;
    off.width = virtualDims.width;
    off.height = virtualDims.height;
    const offCtx = off.getContext('2d');
    if (!offCtx) return;

    drawSonarWaterfall(offCtx, virtualDims.width, virtualDims.height, {
      width: virtualDims.width,
      height: virtualDims.height,
      preset,
      colormap,
      channelMode,
    });
  }, [preset, colormap, channelMode, virtualDims]);

  // Initial draw & colormap change
  useEffect(() => {
    renderAcousticTexture();
  }, [renderAcousticTexture]);

  // Fit to screen helper
  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth === 0 || clientHeight === 0) return;
    
    const scaleX = clientWidth / virtualDims.width;
    const scaleY = clientHeight / virtualDims.height;
    const bestScale = Math.max(0.1, Math.max(scaleX, scaleY) * 0.95);
    setScale(bestScale);
    setPan({
      x: (clientWidth - virtualDims.width * bestScale) / 2,
      y: 20,
    });
  }, [virtualDims]);

  useEffect(() => {
    fitToScreen();
  }, [fitToScreen]);

  // Redraw canvas loop
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Fill viewport background
    ctx.fillStyle = '#070d1e';
    ctx.fillRect(0, 0, width, height);

    // Apply pan and zoom
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(scale, scale);

    // 1. Draw Acoustic Texture (Real Image or Cached Procedural Canvas)
    if (realImageRef.current) {
      ctx.drawImage(realImageRef.current, 0, 0, virtualDims.width, virtualDims.height);
    } else if (offscreenCanvasRef.current) {
      ctx.drawImage(offscreenCanvasRef.current, 0, 0);
    }

    // 2. Draw Waterfall Center Nadir Line & Channel Labels
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1 / scale;
    ctx.setLineDash([6 / scale, 6 / scale]);
    ctx.beginPath();
    ctx.moveTo(virtualDims.width / 2, 0);
    ctx.lineTo(virtualDims.width / 2, virtualDims.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Channel labels top
    ctx.fillStyle = 'rgba(6, 182, 212, 0.7)';
    ctx.font = `bold ${Math.max(10, 12 / scale)}px monospace`;
    ctx.fillText('◀ PORT CHANNEL', 40, 30);
    ctx.fillText('STARBOARD CHANNEL ▶', Math.max(60, virtualDims.width - 220), 30);
    ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.fillText('NADIR TRACK', virtualDims.width / 2 - 40, 30);

    // 3. Draw Acoustic Shadow Vectors if enabled
    if (showShadows) {
      for (const det of detections) {
        const sv = getShadowVector(det);
        if (sv) {
          const isSelected = det.id === selectedDetectionId;

          ctx.save();
          ctx.strokeStyle = isSelected ? '#22d3ee' : 'rgba(239, 68, 68, 0.85)';
          ctx.lineWidth = (isSelected ? 2.5 : 1.5) / scale;
          ctx.setLineDash([4 / scale, 3 / scale]);

          // Draw vector line from target edge extending down-range
          ctx.beginPath();
          ctx.moveTo(sv.startX, sv.startY);
          ctx.lineTo(sv.endX, sv.endY);
          ctx.stroke();

          // Arrowhead
          const angle = Math.atan2(sv.endY - sv.startY, sv.endX - sv.startX);
          const arrowLen = 8 / scale;
          ctx.setLineDash([]);
          ctx.fillStyle = isSelected ? '#22d3ee' : '#ef4444';
          ctx.beginPath();
          ctx.moveTo(sv.endX, sv.endY);
          ctx.lineTo(
            sv.endX - arrowLen * Math.cos(angle - Math.PI / 6),
            sv.endY - arrowLen * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            sv.endX - arrowLen * Math.cos(angle + Math.PI / 6),
            sv.endY - arrowLen * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();

          // Text label for shadow length and derived height
          ctx.fillStyle = isSelected ? '#ffffff' : '#fca5a5';
          ctx.font = `bold ${Math.max(9, 10 / scale)}px monospace`;
          ctx.fillText(
            `SHADOW: ${sv.length_m.toFixed(1)}m (H: ${sv.estimated_height_m.toFixed(1)}m)`,
            sv.endX + 6 / scale,
            sv.endY + 3 / scale
          );

          ctx.restore();
        }
      }
    }

    // 4. Draw Bounding Boxes with Tactical Corner Reticles
    if (showBoxes) {
      for (const det of detections) {
        const [bx, by, bw, bh] = getBoxCoords(det);
        const isSelected = det.id === selectedDetectionId;

        // Risk-specific color
        const color = isSelected
          ? '#22d3ee'
          : det.risk === 'CRITICAL'
          ? '#ef4444'
          : det.risk === 'HIGH'
          ? '#f97316'
          : det.risk === 'MEDIUM'
          ? '#f59e0b'
          : '#22c55e';

        ctx.save();

        // Highlight box background if selected
        if (isSelected) {
          ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
          ctx.fillRect(bx, by, bw, bh);
        }

        // Bounding box frame
        ctx.strokeStyle = color;
        ctx.lineWidth = (isSelected ? 2 : 1.2) / scale;
        ctx.strokeRect(bx, by, bw, bh);

        // Corner reticles (Hydrographic target designators)
        const reticleLen = Math.min(12 / scale, Math.min(bw, bh) * 0.3);
        ctx.lineWidth = (isSelected ? 3 : 2) / scale;
        ctx.strokeStyle = isSelected ? '#ffffff' : color;

        // Top-left
        ctx.beginPath();
        ctx.moveTo(bx, by + reticleLen);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx + reticleLen, by);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(bx + bw - reticleLen, by);
        ctx.lineTo(bx + bw, by);
        ctx.lineTo(bx + bw, by + reticleLen);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(bx, by + bh - reticleLen);
        ctx.lineTo(bx, by + bh);
        ctx.lineTo(bx + reticleLen, by + bh);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(bx + bw - reticleLen, by + bh);
        ctx.lineTo(bx + bw, by + bh);
        ctx.lineTo(bx + bw, by + bh - reticleLen);
        ctx.stroke();

        // Tag label banner above box
        const fontSize = Math.max(9, 11 / scale);
        ctx.font = `bold ${fontSize}px monospace`;
        const labelText = `${det.class_name} [${det.confidence_pct.toFixed(0)}%]`;
        const textWidth = ctx.measureText(labelText).width;
        const bannerHeight = fontSize + 6 / scale;

        ctx.fillStyle = isSelected ? '#083344' : '#0b1329';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1 / scale;
        ctx.fillRect(bx, by - bannerHeight, textWidth + 10 / scale, bannerHeight);
        ctx.strokeRect(bx, by - bannerHeight, textWidth + 10 / scale, bannerHeight);

        ctx.fillStyle = isSelected ? '#38bdf8' : '#f1f5f9';
        ctx.fillText(labelText, bx + 5 / scale, by - 4 / scale);

        // Subtext: ID and Risk
        if (isSelected) {
          ctx.fillStyle = '#f87171';
          ctx.font = `bold ${Math.max(8, 9 / scale)}px monospace`;
          ctx.fillText(`ID: ${det.id} | ${det.risk}`, bx, by + bh + 14 / scale);
        }

        ctx.restore();
      }
    }

    // 5. Draw Interactive Measurement Ruler if active
    if (rulerActive && rulerPoints.start && rulerPoints.end) {
      const p1 = rulerPoints.start;
      const p2 = rulerPoints.end;
      const dxPx = p2.x - p1.x;
      const dyPx = p2.y - p1.y;
      const distPx = Math.hypot(dxPx, dyPx);
      const distMeters = distPx * resolutionMPerPx;

      ctx.save();
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2 / scale;
      ctx.setLineDash([6 / scale, 3 / scale]);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // End markers
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, 4 / scale, 0, Math.PI * 2);
      ctx.arc(p2.x, p2.y, 4 / scale, 0, Math.PI * 2);
      ctx.fill();

      // Measurement tag
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const rulerLabel = `DIST: ${distMeters.toFixed(2)}m (${distPx.toFixed(0)}px)`;

      ctx.font = `bold ${Math.max(10, 12 / scale)}px monospace`;
      const rw = ctx.measureText(rulerLabel).width;
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(midX - rw / 2 - 4 / scale, midY - 14 / scale, rw + 8 / scale, 18 / scale);
      ctx.fillStyle = '#fef08a';
      ctx.fillText(rulerLabel, midX - rw / 2, midY);

      ctx.restore();
    }

    ctx.restore(); // restore viewport transform

    // 6. Draw Screen-Space HUD Overlays (Scale bar & Grid ticks)
    ctx.save();
    const scaleBarPx = (10 / resolutionMPerPx) * scale;
    if (scaleBarPx > 20 && scaleBarPx < width - 100) {
      const sbX = 20;
      const sbY = height - 30;
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sbX, sbY - 6);
      ctx.lineTo(sbX, sbY);
      ctx.lineTo(sbX + scaleBarPx, sbY);
      ctx.lineTo(sbX + scaleBarPx, sbY - 6);
      ctx.stroke();

      ctx.fillStyle = '#22d3ee';
      ctx.font = '10px monospace';
      ctx.fillText(`10 METERS SCALE (${resolutionMPerPx}m/px)`, sbX, sbY - 10);
    }

    ctx.restore();
  }, [
    pan,
    scale,
    showBoxes,
    showShadows,
    detections,
    selectedDetectionId,
    rulerActive,
    rulerPoints,
    resolutionMPerPx,
    virtualDims,
    getBoxCoords,
    getShadowVector,
  ]);

  // Trigger redraw whenever dependencies change
  useEffect(() => {
    redraw();
  }, [redraw]);

  // Redraw when texture is explicitly regenerated
  useEffect(() => {
    redraw();
  }, [renderAcousticTexture, redraw]);

  // Handle ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let initialFitDone = false;
    const ro = new ResizeObserver(() => {
      if (!initialFitDone && container.clientWidth > 0) {
        fitToScreen();
        initialFitDone = true;
      }
      redraw();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [redraw, fitToScreen]);

  // Screen coordinates to virtual sonar coordinates
  const screenToVirtual = (screenX: number, screenY: number) => {
    return {
      x: (screenX - pan.x) / scale,
      y: (screenY - pan.y) / scale,
    };
  };

  // Mouse / Touch handlers for panning & selection
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const vPos = screenToVirtual(clickX, clickY);

    if (rulerActive) {
      if (!rulerPoints.start) {
        setRulerPoints({ start: vPos, end: vPos });
      } else {
        setRulerPoints((prev) => ({ ...prev, end: vPos }));
      }
      return;
    }

    // Check if clicked inside a detection bounding box
    let clickedDet: AnomalyDetection | null = null;
    for (let i = detections.length - 1; i >= 0; i--) {
      const d = detections[i];
      const [bx, by, bw, bh] = getBoxCoords(d);
      if (vPos.x >= bx && vPos.x <= bx + bw && vPos.y >= by && vPos.y <= by + bh) {
        clickedDet = d;
        break;
      }
    }

    if (clickedDet && onSelectDetection) {
      onSelectDetection(clickedDet);
      return;
    }

    // Otherwise start pan
    setIsDragging(true);
    setDragStart({ x: clickX - pan.x, y: clickY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const currX = e.clientX - rect.left;
    const currY = e.clientY - rect.top;
    const vPos = screenToVirtual(currX, currY);

    // Update Telemetry tracking
    const centerX = virtualDims.width / 2;
    const distFromCenterPx = Math.abs(vPos.x - centerX);
    const slantRange = distFromCenterPx * resolutionMPerPx;
    const channel = vPos.x < centerX - 15 ? 'PORT' : vPos.x > centerX + 15 ? 'STARBOARD' : 'NADIR';
    const pingIdx = Math.max(0, Math.floor(vPos.y * 3.5));

    setCursorTelemetry({
      xPx: Math.floor(vPos.x),
      yPx: Math.floor(vPos.y),
      slantRangeM: Math.min(swathRangeM, Math.max(0, slantRange)),
      channel,
      pingIndex: pingIdx,
    });

    if (rulerActive && rulerPoints.start && isDragging) {
      setRulerPoints((prev) => ({ ...prev, end: vPos }));
      return;
    }

    if (!isDragging) return;
    setPan({
      x: currX - dragStart.x,
      y: currY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newScale = Math.max(0.2, Math.min(6.0, scale * zoomFactor));

    // Zoom centered on cursor
    const newPanX = mouseX - (mouseX - pan.x) * (newScale / scale);
    const newPanY = mouseY - (mouseY - pan.y) * (newScale / scale);

    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
  };

  // Zoom button controls
  const handleZoom = (delta: number) => {
    if (!containerRef.current) return;
    const centerX = containerRef.current.clientWidth / 2;
    const centerY = containerRef.current.clientHeight / 2;
    const newScale = Math.max(0.2, Math.min(6.0, scale * delta));
    const newPanX = centerX - (centerX - pan.x) * (newScale / scale);
    const newPanY = centerY - (centerY - pan.y) * (newScale / scale);
    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
  };

  // Snapshot exporter
  const handleExportSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `SONAR_SNAPSHOT_${preset.toUpperCase()}_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-[#070d1e] overflow-hidden select-none border border-slate-200 dark:border-zinc-800 ${className}`}
    >
      {/* Tactical Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`w-full h-full ${rulerActive ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      />

      {/* Top Left Header Tag */}
      <div className="absolute top-3 left-3 bg-white dark:bg-zinc-900/90 backdrop-blur-xs border border-slate-200 dark:border-zinc-800 px-3 py-1.5 rounded-xl flex items-center gap-3 text-xs  text-slate-600 dark:text-slate-600 dark:text-slate-300 pointer-events-none">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-bold text-blue-500 dark:text-blue-300 tracking-wider">ACOUSTIC WATERFALL</span>
        </div>
        <span className="text-slate-600">|</span>
        <span className="text-slate-600 dark:text-slate-600 dark:text-slate-300 truncate max-w-[200px]">{surveyTitle}</span>
        <span className="text-slate-600">|</span>
        <span className="text-blue-600 dark:text-blue-400 ">ZOOM {(scale * 100).toFixed(0)}%</span>
      </div>

      {/* Top Right Channel Mode Pills */}
      <div className="absolute top-3 right-3 flex items-center gap-1 bg-white dark:bg-zinc-900/90 backdrop-blur-xs border border-slate-200 dark:border-zinc-800 p-1 rounded-xl">
        {(['split', 'port', 'starboard'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setChannelMode(mode)}
            className={`px-2 py-1 text-[11px]  uppercase tracking-wider rounded-xl transition-colors ${
              channelMode === mode
                ? 'bg-blue-50 dark:bg-blue-900 text-blue-500 dark:text-blue-300 border border-cyan-700 font-bold'
                : 'text-slate-500 dark:text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-700 dark:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {mode === 'split' ? 'SPLIT DUAL' : mode === 'port' ? 'PORT ONLY' : 'STARBOARD'}
          </button>
        ))}
      </div>

      {/* Floating Tactical Toolbelt (Bottom Center) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-900/95 backdrop-blur-xs border border-cyan-900/60 shadow-xl px-2 py-1.5 rounded-xl flex items-center gap-1.5 text-slate-600 dark:text-slate-600 dark:text-slate-300 z-20">
        {/* Zoom Controls */}
        <button
          onClick={() => handleZoom(1.25)}
          title="Zoom In (+)"
          className="p-1.5 hover:bg-slate-800 text-blue-600 dark:text-blue-400 hover:text-cyan-200 rounded-xl transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom(0.8)}
          title="Zoom Out (-)"
          className="p-1.5 hover:bg-slate-800 text-blue-600 dark:text-blue-400 hover:text-cyan-200 rounded-xl transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={fitToScreen}
          title="Fit to Screen"
          className="p-1.5 hover:bg-slate-800 text-slate-600 dark:text-slate-600 dark:text-slate-300 hover:text-white rounded-xl transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-slate-800 mx-1" />

        {/* Bounding Box Toggle */}
        <button
          onClick={() => setShowBoxes(!showBoxes)}
          title={showBoxes ? 'Hide Bounding Boxes' : 'Show Bounding Boxes'}
          className={`flex items-center gap-1 px-2 py-1 text-xs  rounded-xl border transition-colors ${
            showBoxes
              ? 'bg-blue-50 dark:bg-blue-900/80 border-cyan-600 text-blue-500 dark:text-blue-300'
              : 'border-slate-200 dark:border-zinc-800 text-slate-500 hover:bg-slate-800'
          }`}
        >
          {showBoxes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>BOXES</span>
        </button>

        {/* Shadow Vectors Toggle */}
        <button
          onClick={() => setShowShadows(!showShadows)}
          title={showShadows ? 'Hide Shadow Vectors' : 'Show Acoustic Shadows'}
          className={`flex items-center gap-1 px-2 py-1 text-xs  rounded-xl border transition-colors ${
            showShadows
              ? 'bg-red-950/80 border-red-600 text-red-300'
              : 'border-slate-200 dark:border-zinc-800 text-slate-500 hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>SHADOWS</span>
        </button>

        {/* Measurement Ruler Tool */}
        <button
          onClick={() => {
            setRulerActive(!rulerActive);
            setRulerPoints({ start: null, end: null });
          }}
          title={rulerActive ? 'Disable Ruler' : 'Acoustic Distance Ruler'}
          className={`flex items-center gap-1 px-2 py-1 text-xs  rounded-xl border transition-colors ${
            rulerActive
              ? 'bg-amber-950/90 border-amber-500 text-amber-300'
              : 'border-slate-200 dark:border-zinc-800 text-slate-500 hover:bg-slate-800'
          }`}
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>RULER</span>
        </button>

        <div className="w-[1px] h-5 bg-slate-800 mx-1" />

        {/* Heatmap Colormap Select */}
        <div className="flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <select
            value={colormap}
            onChange={(e) => setColormap(e.target.value as WaterfallOptions['colormap'])}
            className="bg-[#070d1e] border border-slate-700 text-[11px]  text-blue-500 dark:text-blue-300 py-1 px-1.5 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="sonar-amber">AMBER ACOUSTIC</option>
            <option value="cyan-tactical">CYAN TACTICAL</option>
            <option value="phosphor-green">PHOSPHOR GREEN</option>
            <option value="thermal-jet">THERMAL JET</option>
            <option value="grayscale">GRAYSCALE BACKSCATTER</option>
          </select>
        </div>

        <div className="w-[1px] h-5 bg-slate-800 mx-1" />

        {/* Export Snapshot */}
        <button
          onClick={handleExportSnapshot}
          title="Export GeoTIFF/PNG Snapshot"
          className="p-1.5 hover:bg-slate-800 text-slate-600 dark:text-slate-600 dark:text-slate-300 hover:text-blue-500 dark:text-blue-300 rounded-xl transition-colors"
        >
          <Camera className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Right Live Telemetry Bar */}
      {cursorTelemetry && (
        <div className="absolute bottom-3 right-3 bg-white dark:bg-zinc-900/90 backdrop-blur-xs border border-slate-200 dark:border-zinc-800 px-3 py-1.5 rounded-xl  text-[11px] text-slate-500 dark:text-slate-500 dark:text-slate-400 space-x-3 pointer-events-none hidden sm:flex items-center">
          <div>
            <span className="text-slate-500">PING: </span>
            <span className="text-slate-700 dark:text-slate-700 dark:text-slate-200 ">#{cursorTelemetry.pingIndex}</span>
          </div>
          <span className="text-slate-700">|</span>
          <div>
            <span className="text-slate-500">RANGE: </span>
            <span className="text-blue-600 dark:text-blue-400 font-bold ">
              {cursorTelemetry.slantRangeM.toFixed(1)}m
            </span>
          </div>
          <span className="text-slate-700">|</span>
          <div>
            <span className="text-slate-500">CHAN: </span>
            <span
              className={`font-semibold ${
                cursorTelemetry.channel === 'PORT'
                  ? 'text-blue-600 dark:text-blue-400'
                  : cursorTelemetry.channel === 'STARBOARD'
                  ? 'text-amber-600 dark:text-amber-600 dark:text-amber-400'
                  : 'text-slate-500 dark:text-slate-500 dark:text-slate-400'
              }`}
            >
              {cursorTelemetry.channel}
            </span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="text-slate-500 ">
            [{cursorTelemetry.xPx}px, {cursorTelemetry.yPx}px]
          </div>
        </div>
      )}
    </div>
  );
}

export default SonarImageViewer;
