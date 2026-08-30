import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from 'lucide-react';
import DetectionTable from '../components/detections/DetectionTable';
import DetectionDetail from '../components/detections/DetectionDetail';

export default function Detections() {
  const [selectedDetection, setSelectedDetection] = useState(null);
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-light-text dark:text-dark-text mb-2">
            Detections
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
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
