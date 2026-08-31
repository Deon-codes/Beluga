# Phase 4 — Frontend Command Center Core (Next.js 15 + Tailwind CSS 4)

**Phase Goal:** Integrate the SONAR-AI web frontend (sourced from Google AI Studio) with the live FastAPI backend. The shell, design system, canvas viewer, badge components, and all pages are already implemented. What remains are **3 integration gaps** identified in the audit.

**Upstream Contract:** Phases 1–3 complete. CORS open to `http://localhost:3000`. FastAPI on `http://localhost:8000`.

> **Status after audit (2026-08-31):**
> - `[x]` Task 4.1 — Scaffold + Design System → **COMPLETE** (ShellLayout, globals.css, all animations)
> - `[/]` Task 4.2 — API Client → **NEEDS: invert mock/real priority + fix type field names**
> - `[/]` Task 4.3 — SonarImageViewer → **NEEDS: `imageUrl` prop for real scan loading**
> - `[x]` Task 4.4 — UI Components → **COMPLETE** (all 4 + bonus BathymetricMap)
> - `[ ]` Task 4.5 — Pages/Polling → **NEEDS: live status polling wired to real API**

---

## API Surface Reference

| Method | Endpoint | Purpose |
|--------|----------|---------| 
| `POST` | `/survey/upload` | Multipart upload → `{ survey_id, status, filename }` |
| `POST` | `/survey/{id}/analyze` | Kick off background pipeline → 202 |
| `GET`  | `/survey/{id}/status` | Poll `stage` + `progress_pct` (0–100) |
| `GET`  | `/survey/{id}/detections` | Full `SurveyReport` (only when COMPLETED) |
| `GET`  | `/survey/{id}/report.json` | Downloadable JSON report |
| `GET`  | `/survey/{id}/report.csv` | Downloadable CSV report |
| `GET`  | `/storage/{id}/{filename}` | Raw sonar image (StaticFiles) |
| `GET`  | `/health` | Model readiness |

**Pydantic shapes to mirror in TypeScript:**
- `SurveyReport { survey_id, generated_at, image_filename, detections[], processing_stage }`
- `DetectionResult { id, class_name, class_id, confidence_pct, uncertainty_std, certainty, bbox_px, dimensions_m, location, risk }`
- `BoundingBox { x1, y1, x2, y2 }` (pixel coords)
- `GeoTag { lat, lon, geo_confidence: "measured"|"estimated"|"none" }`
- `MetricDimensions { length_m, width_m, height_m }` ← **note _m suffix, differs from AI Studio types**
- `JobStatus { survey_id, stage, progress_pct, error }`

---

## Integration Gap 1 (formerly Task 4.2) — Fix API Client



---

## Task 4.1 — Next.js 16 Project Scaffold + Design System

### Scaffold command (run once, non-interactive)
```bash
cd frontend
npx -y create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

### `frontend/src/app/globals.css` — REPLACE entire file
```css
@import "tailwindcss";

:root {
  --color-abyss:       #05070d;
  --color-deep-navy:   #0b1220;
  --color-panel:       #0f1a2e;
  --color-panel-light: #152035;
  --color-border:      #1e3050;
  --color-cyan:        #22d3ee;
  --color-cyan-dim:    #0e7490;
  --color-teal:        #14b8a6;
  --color-amber:       #f59e0b;
  --color-red:         #ef4444;
  --color-green:       #22c55e;
  --color-text:        #e2e8f0;
  --color-text-muted:  #64748b;
  --font-tabular:      "JetBrains Mono", ui-monospace, monospace;
}

html, body { background-color: var(--color-abyss); color: var(--color-text); }
.tabular { font-variant-numeric: tabular-nums; font-family: var(--font-tabular); }
.glow-cyan { box-shadow: 0 0 12px 2px rgba(34,211,238,0.25); }
```

### `frontend/tailwind.config.ts` — Token extension
```ts
import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        abyss: "var(--color-abyss)", "deep-navy": "var(--color-deep-navy)",
        panel: "var(--color-panel)", "panel-light": "var(--color-panel-light)",
        border: "var(--color-border)", cyan: "var(--color-cyan)",
        "cyan-dim": "var(--color-cyan-dim)", teal: "var(--color-teal)",
        amber: "var(--color-amber)", red: "var(--color-red)",
        green: "var(--color-green)", muted: "var(--color-text-muted)",
      },
      fontFamily: { mono: ["JetBrains Mono", "ui-monospace", "monospace"] },
    },
  },
  plugins: [],
} satisfies Config;
```

### `frontend/src/app/layout.tsx`
```tsx
import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "SONAR-AI Command Center | MoES / NIOT",
  description: "AI-powered automated underwater marine debris and anomaly detection — SIH Problem Statement 26057.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mono.variable}>
      <body className="min-h-screen bg-abyss text-[var(--color-text)] antialiased">{children}</body>
    </html>
  );
}
```

### `frontend/src/components/NavBar.tsx`
Top bar: `◈ SONAR-AI` logo | Dashboard | New Survey | Detections | Reports | live API status dot.
```tsx
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/services/api";

export function NavBar() {
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => {
    apiClient.health().then(() => setOnline(true)).catch(() => setOnline(false));
  }, []);

  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-14 border-b border-[var(--color-border)]
                    bg-[var(--color-deep-navy)]/90 backdrop-blur-md flex items-center px-6 gap-6">
      <Link href="/" className="text-cyan font-bold tracking-widest text-sm uppercase">◈ SONAR-AI</Link>
      <span className="flex-1" />
      {[
        { label: "Dashboard", href: "/dashboard" }, { label: "New Survey", href: "/surveys/new" },
        { label: "Detections", href: "/detections" }, { label: "Reports", href: "/reports" },
      ].map(({ label, href }) => (
        <Link key={href} href={href} className="text-xs font-medium text-muted hover:text-cyan transition-colors uppercase tracking-wider">
          {label}
        </Link>
      ))}
      <span className="ml-4 flex items-center gap-1.5 text-xs tabular text-muted">
        <span className={`w-2 h-2 rounded-full ${online === null ? "bg-amber animate-pulse" : online ? "bg-green" : "bg-red"}`} />
        {online === null ? "checking" : online ? "API LIVE" : "API DOWN"}
      </span>
    </nav>
  );
}
```

**Verification:** `npm run dev` → NavBar renders, cyan logo, status dot animates.

---

## Task 4.2 — Typed API Client

**File:** `frontend/src/services/api.ts` — single integration boundary, no raw fetch anywhere else.

```ts
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface GeoPoint { lat: number; lon: number; }
export interface SurveyMetadata {
  vehicle_speed_mps?: number; sonar_altitude_m?: number; meters_per_pixel?: number;
  anchor_start?: GeoPoint; anchor_end?: GeoPoint;
}
export interface BoundingBox { x1: number; y1: number; x2: number; y2: number; }
export interface MetricDimensions { length_m: number | null; width_m: number | null; height_m: number | null; }
export interface GeoTag { lat: number | null; lon: number | null; geo_confidence: "measured" | "estimated" | "none"; }
export type CertaintyLevel = "HIGH" | "MODERATE" | "LOW";
export type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export interface DetectionResult {
  id: string; class_name: string; class_id: number; confidence_pct: number;
  uncertainty_std: number | null; certainty: CertaintyLevel | null;
  bbox_px: BoundingBox; dimensions_m: MetricDimensions; location: GeoTag; risk: RiskLevel;
}
export interface SurveyReport { survey_id: string; generated_at: string; image_filename: string; detections: DetectionResult[]; processing_stage: string; }
export interface JobStatus { survey_id: string; stage: string; progress_pct: number; error: string | null; }
export interface UploadResponse { survey_id: string; status: string; filename: string; }

export const PIPELINE_STAGES = [
  "INGESTION", "DENOISING", "YOLO_INFERENCE", "FILTERING",
  "SHADOW_SIZING", "MC_DROPOUT", "GEOTAGGING", "COMPLETED",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) { const t = await res.text().catch(() => res.statusText); throw new Error(`[${res.status}] ${path}: ${t}`); }
  return res.json() as Promise<T>;
}

export const apiClient = {
  health: () => request<{ status: string; model_loaded: boolean }>("/health"),
  upload: (file: File, metadata?: SurveyMetadata): Promise<UploadResponse> => {
    const form = new FormData();
    form.append("file", file);
    if (metadata) form.append("metadata", JSON.stringify(metadata));
    return request<UploadResponse>("/survey/upload", { method: "POST", body: form });
  },
  analyze: (id: string) => request<{ survey_id: string; status: string }>(`/survey/${id}/analyze`, { method: "POST" }),
  getStatus: (id: string): Promise<JobStatus> => request(`/survey/${id}/status`),
  getDetections: (id: string): Promise<SurveyReport> => request(`/survey/${id}/detections`),
  getReportJsonUrl: (id: string) => `${BASE}/survey/${id}/report.json`,
  getReportCsvUrl: (id: string) => `${BASE}/survey/${id}/report.csv`,
  getSonarImageUrl: (id: string, filename: string) => `${BASE}/storage/${id}/${filename}`,
};
```

**Verification:** `npx tsc --noEmit` → 0 errors.

---

## Task 4.3 — SonarImageViewer.tsx — HTML5 Canvas

**File:** `frontend/src/components/SonarImageViewer.tsx`

Overlays on raw sonar image:
1. **17-class color-coded bounding boxes** — semi-transparent fill + stroke
2. **Confidence pill label** — `class_name · 87.3%` above each bbox
3. **Shadow projection line** — dashed vertical 28px below bbox centre
4. **Hover highlight** — 4px cyan stroke + shadowBlur glow
5. **Click-to-select** — fires `onSelect(detection)` or `onSelect(null)` on empty click

```tsx
"use client";
import { useEffect, useRef, useCallback } from "react";
import type { DetectionResult } from "@/services/api";

const CLASS_COLORS: Record<string, string> = {
  Pipeline: "#22d3ee", Aircraft: "#a78bfa", Fish: "#34d399", Other: "#94a3b8",
  Shipwreck: "#f97316", MILCO: "#ef4444", NOMBO: "#ec4899", Tire: "#eab308",
  Bottle: "#06b6d4", "Drink-carton": "#84cc16", Chain: "#d97706", Can: "#6366f1",
  Valve: "#14b8a6", Propeller: "#8b5cf6", Hook: "#f43f5e",
  "Shampoo-bottle": "#10b981", "Standing-bottle": "#3b82f6",
};
const colorFor = (c: string) => CLASS_COLORS[c] ?? "#22d3ee";

interface Props {
  imageUrl: string; detections: DetectionResult[];
  selectedId: string | null; onSelect: (d: DetectionResult | null) => void;
}

export function SonarImageViewer({ imageUrl, detections, selectedId, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const hoveredRef = useRef<string | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current; const img = imgRef.current;
    if (!canvas || !img || !img.complete) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    const sx = canvas.width / img.naturalWidth; const sy = canvas.height / img.naturalHeight;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const det of detections) {
      const { x1, y1, x2, y2 } = det.bbox_px;
      const [dx, dy, dw, dh] = [x1 * sx, y1 * sy, (x2 - x1) * sx, (y2 - y1) * sy];
      const color = colorFor(det.class_name);
      const active = hoveredRef.current === det.id || selectedId === det.id;
      ctx.fillStyle = color + (active ? "33" : "1a"); ctx.fillRect(dx, dy, dw, dh);
      ctx.strokeStyle = active ? "#22d3ee" : color; ctx.lineWidth = active ? 3 : 1.5;
      if (active) { ctx.shadowColor = "#22d3ee"; ctx.shadowBlur = 8; }
      ctx.strokeRect(dx, dy, dw, dh); ctx.shadowBlur = 0;
      ctx.setLineDash([4, 3]); ctx.strokeStyle = "#64748b"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(dx + dw / 2, dy + dh); ctx.lineTo(dx + dw / 2, dy + dh + 28); ctx.stroke();
      ctx.setLineDash([]);
      const label = `${det.class_name} · ${det.confidence_pct.toFixed(1)}%`;
      ctx.font = "bold 10px 'JetBrains Mono', monospace";
      const tw = ctx.measureText(label).width + 10; const pillY = Math.max(dy - 18, 4);
      ctx.fillStyle = active ? "#22d3ee" : color;
      ctx.beginPath(); (ctx as CanvasRenderingContext2D).roundRect(dx, pillY, tw, 16, 3); ctx.fill();
      ctx.fillStyle = "#05070d"; ctx.fillText(label, dx + 5, pillY + 11);
    }
  }, [detections, selectedId]);

  useEffect(() => {
    const img = new Image(); img.crossOrigin = "anonymous"; img.src = imageUrl;
    img.onload = () => { imgRef.current = img; draw(); }; imgRef.current = img;
  }, [imageUrl, draw]);

  useEffect(() => { draw(); }, [draw]);

  const hitTest = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; const img = imgRef.current;
    if (!canvas || !img) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
    const sx = canvas.width / img.naturalWidth; const sy = canvas.height / img.naturalHeight;
    return detections.find(d =>
      mx >= d.bbox_px.x1 * sx && mx <= d.bbox_px.x2 * sx &&
      my >= d.bbox_px.y1 * sy && my <= d.bbox_px.y2 * sy) ?? null;
  }, [detections]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const hit = hitTest(e);
    if (hit?.id !== hoveredRef.current) {
      hoveredRef.current = hit?.id ?? null;
      canvasRef.current!.style.cursor = hit ? "pointer" : "crosshair"; draw();
    }
  }, [hitTest, draw]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-[var(--color-border)] bg-[var(--color-abyss)]">
      <canvas ref={canvasRef} className="w-full h-full" style={{ cursor: "crosshair" }}
        onMouseMove={onMouseMove} onMouseLeave={() => { hoveredRef.current = null; draw(); }}
        onClick={e => onSelect(hitTest(e))} />
      <div className="absolute top-2 right-2 text-[10px] text-muted tabular bg-[var(--color-panel)]/80 px-2 py-1 rounded">
        {detections.length} detection{detections.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
```

---

## Task 4.4 — UI Components

### `frontend/src/components/ProcessingStepper.tsx`
```tsx
import { PIPELINE_STAGES, type PipelineStage } from "@/services/api";
const LABELS: Record<string, string> = {
  INGESTION: "Ingestion", DENOISING: "Denoising", YOLO_INFERENCE: "YOLO Inference",
  FILTERING: "Noise Filter", SHADOW_SIZING: "Shadow Sizing",
  MC_DROPOUT: "MC Dropout", GEOTAGGING: "Geotagging", COMPLETED: "Complete",
};
interface Props { stage: string; progressPct: number; }
export function ProcessingStepper({ stage, progressPct }: Props) {
  const idx = PIPELINE_STAGES.indexOf(stage as PipelineStage);
  return (
    <div className="w-full space-y-3">
      <div className="w-full h-1.5 bg-[var(--color-panel)] rounded-full overflow-hidden">
        <div className="h-full bg-cyan rounded-full transition-all duration-700 ease-out" style={{ width: `${progressPct}%` }} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PIPELINE_STAGES.map((s, i) => (
          <span key={s} className={[
            "px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider transition-all",
            i < idx  ? "bg-cyan/20 text-cyan border border-cyan/30" : "",
            s === stage ? "bg-cyan text-abyss border border-cyan animate-pulse" : "",
            i > idx  ? "bg-[var(--color-panel)] text-muted border border-[var(--color-border)]" : "",
          ].join(" ")}>
            {i < idx ? "✓ " : s === stage ? "⟳ " : ""}{LABELS[s]}
          </span>
        ))}
      </div>
      <p className="text-xs tabular text-muted">{progressPct}% complete</p>
    </div>
  );
}
```

### `frontend/src/components/ConfidenceMeter.tsx`
```tsx
import type { CertaintyLevel } from "@/services/api";
const CERT: Record<CertaintyLevel, string> = {
  HIGH: "text-green border-green/30 bg-green/10",
  MODERATE: "text-amber border-amber/30 bg-amber/10",
  LOW: "text-red border-red/30 bg-red/10",
};
interface Props { confidencePct: number; uncertaintyStd: number | null; certainty: CertaintyLevel | null; }
export function ConfidenceMeter({ confidencePct, uncertaintyStd, certainty }: Props) {
  const arc = certainty === "HIGH" ? "var(--color-green)" : certainty === "LOW" ? "var(--color-red)" : "var(--color-amber)";
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-10 h-10">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-panel)" strokeWidth="3" />
          <circle cx="18" cy="18" r="15" fill="none" stroke={arc} strokeWidth="3"
            strokeDasharray={`${(confidencePct / 100) * 94.2} 94.2`} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[9px] tabular font-bold">{confidencePct.toFixed(0)}</span>
      </div>
      <div className="space-y-0.5">
        <p className="text-xs tabular font-semibold">
          {confidencePct.toFixed(1)}%
          {uncertaintyStd !== null && <span className="text-muted ml-1">± {uncertaintyStd.toFixed(2)}σ</span>}
        </p>
        {certainty && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${CERT[certainty]}`}>{certainty}</span>}
      </div>
    </div>
  );
}
```

### `frontend/src/components/GeoBadge.tsx`
```tsx
import type { GeoTag } from "@/services/api";
export function GeoBadge({ location }: { location: GeoTag }) {
  if (location.geo_confidence === "none" || location.lat === null)
    return <span className="text-[10px] text-muted italic">No GPS data</span>;
  return (
    <div className="space-y-0.5">
      <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
        location.geo_confidence === "measured" ? "text-cyan border-cyan/30 bg-cyan/10" : "text-amber border-amber/30 bg-amber/10"}`}>
        {location.geo_confidence === "measured" ? "⊕ Measured GPS" : "~ Estimated Anchor"}
      </span>
      <p className="text-xs tabular text-muted">{location.lat!.toFixed(6)}°, {location.lon!.toFixed(6)}°</p>
    </div>
  );
}
```

### `frontend/src/components/RiskBadge.tsx`
```tsx
import type { RiskLevel } from "@/services/api";
const RISK: Record<RiskLevel, string> = {
  CRITICAL: "text-red border-red/50 bg-red/15 animate-pulse",
  HIGH: "text-orange-400 border-orange-400/40 bg-orange-400/10",
  MEDIUM: "text-amber border-amber/40 bg-amber/10",
  LOW: "text-green border-green/40 bg-green/10",
};
export function RiskBadge({ risk }: { risk: RiskLevel }) {
  return (
    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-widest ${RISK[risk]}`}>{risk}</span>
  );
}
```

---

## Task 4.5 — Pages

### `frontend/src/app/surveys/new/page.tsx` — Upload Console

Two-column layout. Left: dropzone + submit. Right: parameter form (speed, altitude, resolution, GPS anchors).

**Flow:** drop file → fill form → `upload()` → `analyze()` → redirect to `/surveys/{id}`

```tsx
"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { apiClient, type SurveyMetadata } from "@/services/api";

export default function NewSurveyPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState("");
  const [alt, setAlt] = useState("");
  const [mpp, setMpp] = useState("0.05");
  const [lat1, setLat1] = useState(""); const [lon1, setLon1] = useState("");
  const [lat2, setLat2] = useState(""); const [lon2, setLon2] = useState("");

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) setFile(f);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError("Please select a sonar scan file."); return; }
    setUploading(true); setError(null);
    const metadata: SurveyMetadata = {
      vehicle_speed_mps: speed ? Number(speed) : undefined,
      sonar_altitude_m: alt ? Number(alt) : undefined,
      meters_per_pixel: mpp ? Number(mpp) : 0.05,
      anchor_start: lat1 && lon1 ? { lat: Number(lat1), lon: Number(lon1) } : undefined,
      anchor_end: lat2 && lon2 ? { lat: Number(lat2), lon: Number(lon2) } : undefined,
    };
    try {
      const { survey_id } = await apiClient.upload(file, metadata);
      await apiClient.analyze(survey_id);
      router.push(`/surveys/${survey_id}`);
    } catch (err) { setError(err instanceof Error ? err.message : "Upload failed"); setUploading(false); }
  };

  return (
    <>
      <NavBar />
      <main className="pt-20 min-h-screen bg-abyss px-6 py-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-cyan mb-1 tracking-wide">New Survey Mission</h1>
        <p className="text-muted text-sm mb-8">Upload a raw sonar log and configure trajectory parameters.</p>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => document.getElementById("file-input")?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
                ${dragging ? "border-cyan bg-cyan/5 glow-cyan" : "border-[var(--color-border)] hover:border-cyan/50"}`}>
              <input id="file-input" type="file" className="hidden" accept="image/png,image/jpeg,image/tiff,.tiff,.tif"
                onChange={e => setFile(e.target.files?.[0] ?? null)} />
              {file ? (
                <div className="space-y-2">
                  <p className="text-cyan text-sm font-semibold">{file.name}</p>
                  <p className="text-muted text-xs tabular">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <>
                  <p className="text-3xl mb-3">⊕</p>
                  <p className="text-muted text-sm">Drag &amp; drop sonar scan here</p>
                  <p className="text-muted text-xs mt-1">PNG · JPEG · TIFF</p>
                </>
              )}
            </div>
            {error && <p className="text-red text-xs border border-red/30 bg-red/10 rounded px-3 py-2">{error}</p>}
            <button type="submit" disabled={uploading || !file}
              className="w-full py-3 rounded-lg bg-cyan text-abyss font-bold tracking-widest uppercase text-sm
                         hover:bg-cyan/90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {uploading ? "Uploading & Analyzing..." : "Launch Analysis"}
            </button>
          </div>
          <div className="bg-[var(--color-panel)] border border-[var(--color-border)] rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Survey Parameters</h2>
            {[
              { id: "speed", label: "Vehicle Speed (m/s)", val: speed, set: setSpeed, ph: "e.g. 1.5" },
              { id: "alt",   label: "Sonar Altitude (m)",  val: alt,   set: setAlt,   ph: "e.g. 5.0" },
              { id: "mpp",   label: "Metres per Pixel",    val: mpp,   set: setMpp,   ph: "0.05" },
            ].map(({ id, label, val, set, ph }) => (
              <div key={id}>
                <label htmlFor={id} className="block text-xs text-muted mb-1">{label}</label>
                <input id={id} type="number" step="any" value={val} onChange={e => set(e.target.value)} placeholder={ph}
                  className="w-full bg-[var(--color-abyss)] border border-[var(--color-border)] rounded px-3 py-2
                             text-sm tabular text-[var(--color-text)] placeholder:text-muted/50
                             focus:outline-none focus:border-cyan transition-colors" />
              </div>
            ))}
            <div className="pt-2 border-t border-[var(--color-border)] grid grid-cols-2 gap-3">
              <p className="col-span-2 text-xs text-muted uppercase tracking-wider font-bold">GPS Anchors (optional)</p>
              {[
                { id: "lat1", label: "Start Lat", val: lat1, set: setLat1 },
                { id: "lon1", label: "Start Lon", val: lon1, set: setLon1 },
                { id: "lat2", label: "End Lat",   val: lat2, set: setLat2 },
                { id: "lon2", label: "End Lon",   val: lon2, set: setLon2 },
              ].map(({ id, label, val, set }) => (
                <div key={id}>
                  <label htmlFor={id} className="block text-xs text-muted mb-1">{label}</label>
                  <input id={id} type="number" step="any" value={val} onChange={e => set(e.target.value)} placeholder="0.000000"
                    className="w-full bg-[var(--color-abyss)] border border-[var(--color-border)] rounded px-3 py-2
                               text-xs tabular text-[var(--color-text)] placeholder:text-muted/50
                               focus:outline-none focus:border-cyan transition-colors" />
                </div>
              ))}
            </div>
          </div>
        </form>
      </main>
    </>
  );
}
```

---

### `frontend/src/app/surveys/[id]/page.tsx` — Interactive Analysis Console

**Layout:** Full-height. Left 60%: canvas. Right 40%: stepper (while processing), then detection list + inspector.
**Polling:** `setInterval` 1500ms on `getStatus()` until COMPLETED/ERROR. `useRef` for interval handle.

```tsx
"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { use } from "react";
import { NavBar } from "@/components/NavBar";
import { SonarImageViewer } from "@/components/SonarImageViewer";
import { ProcessingStepper } from "@/components/ProcessingStepper";
import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { GeoBadge } from "@/components/GeoBadge";
import { RiskBadge } from "@/components/RiskBadge";
import { apiClient, type JobStatus, type SurveyReport, type DetectionResult } from "@/services/api";

interface Props { params: Promise<{ id: string }>; }

export default function SurveyPage({ params }: Props) {
  const { id: surveyId } = use(params);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [report, setReport] = useState<SurveyReport | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const fetchReport = useCallback(async () => {
    try { setReport(await apiClient.getDetections(surveyId)); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to load report"); }
  }, [surveyId]);

  useEffect(() => {
    apiClient.getStatus(surveyId)
      .then(async (s) => {
        setJobStatus(s);
        if (s.stage === "COMPLETED") { await fetchReport(); }
        else if (s.stage !== "ERROR") {
          pollRef.current = setInterval(async () => {
            try {
              const st = await apiClient.getStatus(surveyId);
              setJobStatus(st);
              if (st.stage === "COMPLETED") { stopPolling(); await fetchReport(); }
              else if (st.stage === "ERROR") { stopPolling(); setError(st.error ?? "Pipeline error"); }
            } catch { stopPolling(); }
          }, 1500);
        }
      })
      .catch(e => setError(e instanceof Error ? e.message : "Survey not found"));
    return stopPolling;
  }, [surveyId, fetchReport, stopPolling]);

  const selected = report?.detections.find(d => d.id === selectedId) ?? null;
  const imageUrl = report ? apiClient.getSonarImageUrl(surveyId, report.image_filename) : "";

  return (
    <>
      <NavBar />
      <main className="pt-14 h-screen flex flex-col bg-abyss">
        <div className="flex items-center gap-4 px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-deep-navy)]">
          <span className="text-xs text-muted uppercase tracking-widest font-mono">Survey</span>
          <span className="text-sm text-cyan font-bold tabular">{surveyId}</span>
          <span className="flex-1" />
          {report && (
            <div className="flex gap-3">
              <a href={apiClient.getReportJsonUrl(surveyId)} download
                className="text-xs px-3 py-1 rounded border border-cyan/30 text-cyan hover:bg-cyan/10 transition-colors">↓ JSON</a>
              <a href={apiClient.getReportCsvUrl(surveyId)} download
                className="text-xs px-3 py-1 rounded border border-teal/30 text-teal hover:bg-teal/10 transition-colors">↓ CSV</a>
            </div>
          )}
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 p-3">
            {report ? (
              <SonarImageViewer imageUrl={imageUrl} detections={report.detections}
                selectedId={selectedId} onSelect={d => setSelectedId(d?.id ?? null)} />
            ) : (
              <div className="w-full h-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)]
                              flex flex-col items-center justify-center gap-6 p-8">
                {jobStatus && <div className="w-full max-w-md"><ProcessingStepper stage={jobStatus.stage} progressPct={jobStatus.progress_pct} /></div>}
                {error && <p className="text-red text-sm">{error}</p>}
                {!jobStatus && !error && <p className="text-muted text-sm animate-pulse">Loading survey...</p>}
              </div>
            )}
          </div>
          <aside className="w-80 flex flex-col border-l border-[var(--color-border)] bg-[var(--color-panel)] overflow-y-auto">
            {jobStatus && jobStatus.stage !== "COMPLETED" && jobStatus.stage !== "ERROR" && (
              <div className="p-4 border-b border-[var(--color-border)]">
                <ProcessingStepper stage={jobStatus.stage} progressPct={jobStatus.progress_pct} />
              </div>
            )}
            {selected ? (
              <div className="p-4 space-y-4 border-b border-[var(--color-border)]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted tabular">{selected.id}</p>
                    <p className="text-base font-bold">{selected.class_name}</p>
                  </div>
                  <RiskBadge risk={selected.risk} />
                </div>
                <ConfidenceMeter confidencePct={selected.confidence_pct} uncertaintyStd={selected.uncertainty_std} certainty={selected.certainty} />
                <GeoBadge location={selected.location} />
                {selected.dimensions_m && (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {([["L", selected.dimensions_m.length_m], ["W", selected.dimensions_m.width_m], ["H", selected.dimensions_m.height_m]] as [string, number | null][]).map(([lbl, val]) => (
                      <div key={lbl} className="bg-[var(--color-abyss)] rounded p-2 border border-[var(--color-border)]">
                        <p className="text-[10px] text-muted">{lbl} (m)</p>
                        <p className="text-sm tabular font-bold">{val !== null ? val.toFixed(2) : "—"}</p>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => setSelectedId(null)}
                  className="w-full text-xs text-muted border border-[var(--color-border)] rounded py-1 hover:text-[var(--color-text)] transition-colors">
                  ✕ Clear Selection
                </button>
              </div>
            ) : (
              <div className="p-4 border-b border-[var(--color-border)]">
                <p className="text-xs text-muted">Click a detection on the canvas to inspect.</p>
              </div>
            )}
            {report && report.detections.length > 0 && (
              <div className="flex-1 overflow-y-auto divide-y divide-[var(--color-border)]">
                {report.detections.map(d => (
                  <button key={d.id} onClick={() => setSelectedId(d.id === selectedId ? null : d.id)}
                    className={`w-full text-left px-4 py-3 transition-colors hover:bg-[var(--color-panel-light)]
                      ${selectedId === d.id ? "bg-cyan/10 border-l-2 border-cyan" : ""}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">{d.class_name}</span>
                      <RiskBadge risk={d.risk} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] tabular text-muted">{d.confidence_pct.toFixed(1)}%</span>
                      {d.certainty && (
                        <span className={`text-[9px] font-bold uppercase px-1 rounded ${
                          d.certainty === "HIGH" ? "text-green" : d.certainty === "LOW" ? "text-red" : "text-amber"}`}>
                          {d.certainty}
                        </span>
                      )}
                      <span className="text-[10px] tabular text-muted ml-auto">{d.id}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {report && report.detections.length === 0 && (
              <div className="flex-1 flex items-center justify-center p-6">
                <p className="text-muted text-sm text-center">No detections found in this sonar scan.</p>
              </div>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}
```

---

## Environment Setup

```bash
# 1. Scaffold (once, inside frontend/)
cd "c:\Users\varad\Documents\SIH 2026\Sih_underthewater\frontend"
npx -y create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack

# 2. Optional: set API base URL
echo NEXT_PUBLIC_API_URL=http://localhost:8000 > .env.local

# 3. Dev server
npm run dev
```

---

## Verification Plan

### 4.1 Scaffold
```bash
npm run dev  # localhost:3000, NavBar renders, cyan logo, dot animates
```

### 4.2 TypeScript
```bash
npx tsc --noEmit  # 0 errors
```

### 4.3 Canvas smoke
Visit `/surveys/[completed-id]` → image loads, bboxes colored, hover → cyan glow + pointer, click → inspector populates.

### 4.4 Component isolation
`<ProcessingStepper stage="MC_DROPOUT" progressPct={80} />` → bar 80%, active pill pulses, prior stages show ✓.

### 4.5 E2E flow (10 steps)
```
1.  cd backend && uvicorn app.main:app --reload
2.  cd frontend && npm run dev
3.  Navigate to http://localhost:3000/surveys/new
4.  Drop a sonar image; optionally fill altitude/speed
5.  Click "Launch Analysis"
6.  Redirect fires to /surveys/{survey_id}
7.  Stepper animates through all 8 stages
8.  On COMPLETED: sonar canvas + bounding boxes render
9.  Click a detection → ConfidenceMeter + GeoBadge + L/W/H grid show in sidebar
10. Click ↓ JSON / ↓ CSV → browser downloads the files
```

**All 5 tasks verified → Phase 4 COMPLETE.**

---

## Open Questions

> None — all design decisions are resolved by upstream phase contracts and the ROADMAP spec.
