import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { ships, surveyLocations, detections } from '../../data/mockData';

const shipMarkerIcon = L.divIcon({
  className: 'ship-marker',
  html: '<div style="background:#00d9ff;border:2px solid #ffffff;border-radius:9999px;width:16px;height:16px;box-shadow:0 0 12px rgba(0,217,255,0.8);"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const layers = ['Sonar', 'Detections', 'Risk Zones', 'Routes'];

export default function IndiaMap() {
  const [shipPositions, setShipPositions] = useState(ships);
  const [activeLayer, setActiveLayer] = useState('Sonar');
  const navigate = useNavigate();
  const mapRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setShipPositions((prev) =>
        prev.map((ship) => ({
          ...ship,
          currentPosition: (ship.currentPosition + 1) % ship.route.length,
        }))
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-full min-h-[520px] overflow-hidden rounded-xl border border-cyan-400/15 bg-[#071018] xl:min-h-[calc(100vh-96px)]">
      <div className="absolute left-1/2 top-3 z-[500] flex -translate-x-1/2 gap-1 rounded-lg border border-cyan-400/20 bg-[#0d1b2a]/85 p-1 backdrop-blur">
        {layers.map((layer) => (
          <button
            key={layer}
            onClick={() => setActiveLayer(layer)}
            className={`rounded-md px-3 py-1 text-xs ${
              activeLayer === layer ? 'bg-cyan-400/20 text-cyan-200' : 'text-slate-400 hover:text-white'
            }`}
          >
            {layer}
          </button>
        ))}
      </div>

      <div className="absolute bottom-3 left-3 z-[500] rounded-md border border-cyan-400/20 bg-[#0d1b2a]/85 px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur">
        CENTER POSITION: 20°30'N 78°54'E
      </div>

      <MapContainer
        ref={mapRef}
        center={[20.5, 78.9]}
        zoom={5}
        zoomControl={false}
        attributionControl={false}
        className="h-full min-h-[520px] w-full"
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

        {shipPositions.map((ship) => {
          const position = ship.route[ship.currentPosition] || ship.route[0];
          return (
            <Marker key={ship.id} position={position} icon={shipMarkerIcon}>
              <Popup>
                <div className="space-y-1 text-sm">
                  <div className="font-semibold">{ship.name}</div>
                  <div>Status: {ship.status}</div>
                  <div>Speed: {ship.speed} knots</div>
                  <div>Mission: {ship.mission}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
        {(activeLayer === 'Sonar' || activeLayer === 'Routes') &&
          shipPositions.map((ship) => (
            <Polyline key={`${ship.id}-route`} positions={ship.route} pathOptions={{ color: '#00d9ff', weight: 2, opacity: 0.55, dashArray: '8 12' }} />
          ))}

        {(activeLayer === 'Sonar' || activeLayer === 'Risk Zones') &&
          surveyLocations.map((survey) => {
            const isProcessing = survey.status === 'processing';
            const color = isProcessing ? '#f97316' : '#ef4444';
            return (
              <CircleMarker
                key={survey.id}
                center={[survey.lat, survey.lng]}
                radius={isProcessing ? 11 : 8}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.75, weight: 2 }}
                eventHandlers={{ dblclick: () => navigate('/new-survey') }}
              >
                <Popup>
                  <div className="space-y-1 text-sm">
                    <div className="font-semibold">{survey.name}</div>
                    <div>Status: {isProcessing ? 'Survey Processing' : 'Survey Processed'}</div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {(activeLayer === 'Sonar' || activeLayer === 'Detections') &&
          detections.map((detection) => (
            <CircleMarker
              key={detection.id}
              center={[detection.lat, detection.lng]}
              radius={7}
              pathOptions={{
                color: detection.risk === 'HIGH' ? '#ef4444' : detection.risk === 'MEDIUM' ? '#f59e0b' : '#22c55e',
                fillColor: detection.risk === 'HIGH' ? '#ef4444' : detection.risk === 'MEDIUM' ? '#f59e0b' : '#22c55e',
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Popup>
                <div className="space-y-1 text-sm">
                  <div className="font-semibold">{detection.id}</div>
                  <div>{detection.classification}</div>
                  <div>Risk: {detection.risk}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
      </MapContainer>
    </div>
  );
}
