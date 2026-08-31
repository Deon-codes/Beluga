import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, Popup, CircleMarker, Polyline, Polygon } from 'react-leaflet';
import { Compass } from 'lucide-react';
import L from 'leaflet';
import { ships, surveyLocations, detections } from '../../data/mockData';

const shipMarkerIcon = L.divIcon({
  className: 'ship-marker',
  html: '<div style="background:#00d9ff;border:2px solid #ffffff;border-radius:9999px;width:16px;height:16px;box-shadow:0 0 12px rgba(0,217,255,0.8);"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const indiaOutline = [
  [28.6, 68.1],
  [26.8, 70.8],
  [23.8, 72.7],
  [21.8, 73.7],
  [20.2, 74.4],
  [19.2, 76.3],
  [18.1, 77.8],
  [17.2, 80.1],
  [15.9, 81.5],
  [14.8, 84.5],
  [13.5, 87.1],
  [11.8, 88.7],
  [10.2, 92.3],
  [9.3, 93.7],
  [10.8, 95.1],
  [13.0, 96.0],
  [17.2, 96.9],
  [22.0, 95.5],
  [24.5, 92.1],
  [27.6, 88.7],
  [29.5, 84.2],
  [30.0, 78.4],
  [28.6, 68.1],
];

export default function IndiaMap() {
  const [shipPositions, setShipPositions] = useState(ships);
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const lastWheelTimeRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setShipPositions((prev) =>
        prev.map((ship) => {
          const nextPos = (ship.currentPosition + 1) % ship.route.length;
          return { ...ship, currentPosition: nextPos };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.scrollWheelZoom.disable();
    map.doubleClickZoom.disable();
    map.boxZoom.disable();
    map.dragging.disable();
    map.keyboard.disable();

    const container = map.getContainer();
    container.style.touchAction = 'none';
    container.style.overscrollBehavior = 'contain';
    container.style.userSelect = 'none';
  }, []);

  const handleMapGesture = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const now = Date.now();
    const isDoubleAction = now - lastWheelTimeRef.current < 450;
    lastWheelTimeRef.current = now;

    if (isDoubleAction) {
      navigate('/new-survey');
    }
  };

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_58%),linear-gradient(135deg,_#f8fcff_0%,_#ebf6ff_35%,_#eef7fb_100%)] p-3 dark:bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.10),_transparent_55%),linear-gradient(135deg,_#020817_0%,_#0f172a_30%,_#111827_100%)]"
      onDoubleClick={() => navigate('/new-survey')}
      onWheelCapture={(event) => {
        if (Math.abs(event.deltaY) > 0) {
          handleMapGesture(event);
        }
      }}
      onTouchStart={(event) => {
        if (event.touches.length >= 2) navigate('/new-survey');
      }}
    >
      <div className="absolute left-5 top-5 z-[500] flex items-center gap-3 rounded-full border border-sky-200/80 bg-white/80 px-3.5 py-2 shadow-lg shadow-sky-200/60 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/75 dark:shadow-slate-950/50">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
          <Compass className="h-4 w-4" />
        </div>
        <div className="leading-none">
          <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Mission
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
            India Coastline
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-5 right-5 z-[500] flex h-28 w-28 items-center justify-center rounded-full border-[7px] border-slate-700/80 bg-slate-900/85 shadow-[0_0_0_8px_rgba(148,163,184,0.18),0_18px_40px_rgba(15,23,42,0.35)] dark:border-slate-200/75 dark:bg-slate-950/85">
        <div className="relative h-20 w-20 rounded-full border border-slate-400/90 bg-[radial-gradient(circle,_rgba(14,165,233,0.16),_transparent_55%)]">
          <div className="absolute inset-1 rounded-full border border-slate-500/70" />
          <div className="absolute left-1/2 top-0 h-5 w-px -translate-x-1/2 bg-slate-200" />
          <div className="absolute bottom-0 left-1/2 h-5 w-px -translate-x-1/2 bg-slate-200" />
          <div className="absolute left-0 top-1/2 h-px w-5 -translate-y-1/2 bg-slate-200" />
          <div className="absolute right-0 top-1/2 h-px w-5 -translate-y-1/2 bg-slate-200" />
          <div
            className="absolute left-1/2 top-1/2 h-9 w-1 -translate-x-1/2 -translate-y-[76%] rounded-full bg-gradient-to-b from-sky-400 to-cyan-500 shadow-[0_0_12px_rgba(56,189,248,0.8)]"
            style={{ transform: 'translate(-50%, -76%) rotate(28deg)' }}
          />
          <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-100" />
          <span className="absolute left-1/2 top-0 -translate-x-1/2 text-[9px] font-bold tracking-[0.22em] text-slate-100">N</span>
          <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[8px] font-bold tracking-[0.18em] text-slate-100">E</span>
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[8px] font-bold tracking-[0.18em] text-slate-100">S</span>
          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[8px] font-bold tracking-[0.18em] text-slate-100">W</span>
        </div>
      </div>

      <MapContainer
        ref={mapRef}
        center={[20.5, 78.9]}
        zoom={5}
        minZoom={5}
        maxZoom={5}
        zoomControl={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        dragging={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        attributionControl={false}
        className="h-[360px] w-full rounded-[24px] border border-slate-200 bg-slate-100/70 shadow-inner shadow-slate-200/70 dark:border-slate-700 dark:bg-slate-950/60 dark:shadow-slate-950/50 sm:h-[460px] md:h-[560px]"
        style={{ overscrollBehavior: 'contain', touchAction: 'none' }}
      >
        <Polygon
          positions={indiaOutline}
          pathOptions={{
            color: '#0ea5e9',
            weight: 2.5,
            fillColor: '#bae6fd',
            fillOpacity: 0.18,
            opacity: 0.9,
          }}
        />

        {shipPositions.map((ship) => {
          const position = ship.route[ship.currentPosition] || ship.route[0];

          return (
            <div key={ship.id}>
              <Polyline
                positions={ship.route}
                pathOptions={{ color: '#00d9ff', weight: 2, opacity: 0.5, dashArray: '8 12' }}
              />
              <Marker position={position} icon={shipMarkerIcon}>
                <Popup>
                  <div className="space-y-1 text-sm">
                    <div className="font-semibold text-slate-900">{ship.name}</div>
                    <div>Status: {ship.status}</div>
                    <div>Speed: {ship.speed} knots</div>
                    <div>Mission: {ship.mission}</div>
                  </div>
                </Popup>
              </Marker>
            </div>
          );
        })}

        {surveyLocations.map((survey) => {
          const isProcessing = survey.status === 'processing';
          const color = isProcessing ? '#f97316' : '#ef4444';

          return (
            <CircleMarker
              key={survey.id}
              center={[survey.lat, survey.lng]}
              radius={isProcessing ? 11 : 8}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: isProcessing ? 0.7 : 1,
                weight: 2,
                opacity: 1,
              }}
            >
              <Popup>
                <div className="space-y-1 text-sm">
                  <div className="font-semibold text-slate-900">{survey.name}</div>
                  <div>
                    Status: {isProcessing ? 'Survey Processing' : 'Survey Processed'}
                  </div>
                  {!isProcessing ? (
                    <>
                      <div>Objects Detected: {survey.objectsDetected}</div>
                      <div>High Risk: {survey.highRisk}</div>
                      <div>Date: {survey.date}</div>
                    </>
                  ) : (
                    <>
                      <div>Location: {survey.location}</div>
                      <div>Started: {survey.started}</div>
                      <div>Progress: {survey.progress}%</div>
                    </>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {detections.map((detection) => (
          <CircleMarker
            key={detection.id}
            center={[detection.lat, detection.lng]}
            radius={6}
            pathOptions={{
              color: detection.risk === 'HIGH' ? '#ef4444' : detection.risk === 'MEDIUM' ? '#f59e0b' : '#84cc16',
              fillColor: detection.risk === 'HIGH' ? '#ef4444' : detection.risk === 'MEDIUM' ? '#f59e0b' : '#84cc16',
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup>
              <div className="space-y-1 text-sm">
                <div className="font-semibold text-slate-900">{detection.id}</div>
                <div>Classification: {detection.classification}</div>
                <div>Confidence: {detection.confidence}%</div>
                <div>Risk: {detection.risk}</div>
                <div>Survey: {detection.survey}</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}