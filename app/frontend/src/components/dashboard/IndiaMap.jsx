import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { ships, surveyLocations, detections } from '../../data/mockData';

const shipMarkerIcon = L.divIcon({
  className: 'ship-marker',
  html: '<div style="background:#00d9ff;border:2px solid #ffffff;border-radius:9999px;width:16px;height:16px;box-shadow:0 0 12px rgba(0,217,255,0.8);"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export default function IndiaMap() {
  const [shipPositions, setShipPositions] = useState(ships);

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

  return (
    <div className="h-full w-full overflow-hidden bg-slate-50 p-3 dark:bg-slate-950">
      <MapContainer
        center={[20.5, 78.9]}
        zoom={5}
        scrollWheelZoom={false}
        className="h-[360px] sm:h-[460px] md:h-[560px] w-full rounded-2xl border border-slate-200 dark:border-slate-700"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
