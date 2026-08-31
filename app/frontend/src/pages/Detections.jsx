import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from 'lucide-react';
import DetectionTable from '../components/detections/DetectionTable';
import DetectionDetail from '../components/detections/DetectionDetail';

export default function Detections() {
  const [selectedDetection, setSelectedDetection] = useState(null);
  const navigate = useNavigate();

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="mb-2 text-4xl font-bold">
            Detections
          </h1>
          <p className="text-slate-400">
            AI-detected objects from sonar analysis
          </p>
        </div>

        <button
          onClick={() => navigate('/new-survey')}
          className="btn-primary text-sm flex items-center gap-2 bg-gradient-to-r from-ocean-blue to-cyan hover:opacity-90 self-start sm:self-auto shadow-md"
        >
          <Navigation size={16} /> Eco-Optimized Cleanup Route
        </button>
      </div>

      <DetectionTable onSelectDetection={setSelectedDetection} />

      {selectedDetection && (
        <DetectionDetail
          detection={selectedDetection}
          onClose={() => setSelectedDetection(null)}
        />
      )}
    </div>
  );
}
