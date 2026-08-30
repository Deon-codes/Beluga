import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { vesselStartLocation, sampleDebrisLocations } from '../../data/routeMockData';

// Custom Vessel Icon
const shipIcon = L.divIcon({
  className: 'custom-vessel-marker',
  html: `<div style="
    background: #00d9ff;
    border: 2px solid #ffffff;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 16px rgba(0, 217, 255, 0.9);
    color: #0f172a;
    font-size: 14px;
    font-weight: bold;
  ">🚢</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export default function DetectionMap({ activeCandidateRoute, isOptimizing, isComplete }) {
  const centerLat = 18.928;
  const centerLng = 72.828;

  // Helper for priority color code
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH':
        return '#ef4444'; // Red
      case 'MEDIUM':
        return '#f97316'; // Amber/Orange
      case 'LOW':
        return '#22c55e'; // Green
      default:
        return '#00d9ff';
    }
  };

  return (
    <div className="relative w-full h-[360px] sm:h-[440px] md:h-[520px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Start Position Marker */}
        <Marker position={[vesselStartLocation.lat, vesselStartLocation.lng]} icon={shipIcon}>
          <Popup>
            <div className="p-1 space-y-1 text-slate-900">
              <div className="font-bold flex items-center gap-1.5 text-cyan-600">
                <span>🚢</span> {vesselStartLocation.name}
              </div>
              <div className="text-xs text-slate-600">Starting Hub / Survey Base</div>
              <div className="text-xs font-mono font-semibold">
                {vesselStartLocation.lat}° N, {vesselStartLocation.lng}° E
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Debris Markers (D1 - D7) */}
        {sampleDebrisLocations.map((debris) => {
          const color = getPriorityColor(debris.priority);
          // Check if this debris is part of optimal route sequence
          const stepIndex = activeCandidateRoute
            ? activeCandidateRoute.sequence.indexOf(debris.id)
            : -1;

          return (
            <CircleMarker
              key={debris.id}
              center={[debris.lat, debris.lng]}
              radius={10}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.85,
                weight: 3,
              }}
            >
              <Popup>
                <div className="p-1 space-y-1.5 min-w-[170px] text-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                    <span className="font-bold text-xs sm:text-sm text-slate-900">{debris.id} ({debris.name})</span>
                    <span
                      className="text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded text-white"
                      style={{ backgroundColor: color }}
                    >
                      {debris.priority}
                    </span>
                  </div>
                  <div className="text-xs text-slate-700">
                    <strong>Classification:</strong> {debris.classification}
                  </div>
                  <div className="text-xs text-slate-700 flex justify-between">
                    <span><strong>Confidence:</strong> {debris.confidence}%</span>
                    <span><strong>Depth:</strong> {debris.depth}</span>
                  </div>
                  <div className="text-xs text-slate-700">
                    <strong>Size:</strong> {debris.size}
                  </div>
                  {stepIndex > 0 && (
                    <div className="text-xs font-bold text-cyan-600 pt-1 border-t border-slate-100">
                      Cleanup Sequence Stop #{stepIndex}
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Polyline Route Rendering */}
        {activeCandidateRoute && (
          <>
            {/* Primary Path Polyline */}
            <Polyline
              positions={activeCandidateRoute.path}
              pathOptions={{
                color: isComplete ? '#00d9ff' : '#f59e0b',
                weight: isComplete ? 5 : 3,
                opacity: isComplete ? 0.95 : 0.7,
                dashArray: isOptimizing ? '8, 8' : 'none',
              }}
            />

            {/* Glowing background polyline when route is complete */}
            {isComplete && (
              <Polyline
                positions={activeCandidateRoute.path}
                pathOptions={{
                  color: '#00d9ff',
                  weight: 12,
                  opacity: 0.25,
                }}
              />
            )}
          </>
        )}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-2 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg text-[10px] sm:text-xs space-y-1.5 sm:space-y-2 max-w-[140px] sm:max-w-none">
        <div className="font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1">
          Debris Priority
        </div>
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
          <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500 shadow-sm inline-block shrink-0"></span>
          <span>High Priority</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
          <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-500 shadow-sm inline-block shrink-0"></span>
          <span>Med Priority</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
          <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 shadow-sm inline-block shrink-0"></span>
          <span>Low Priority</span>
        </div>
        <div className="pt-1 border-t border-slate-200 dark:border-slate-700 flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
          <span className="w-3 h-1 bg-cyan-400 inline-block rounded-full shrink-0"></span>
          <span>Eco Route</span>
        </div>
      </div>
    </div>
  );
}
