import { useState } from 'react';
import { X } from 'lucide-react';

export default function DetectionDetail({ detection, onClose }) {
  const [status, setStatus] = useState(detection.status);

  if (!detection) return null;

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'HIGH':
        return 'text-red-600 dark:text-red-400';
      case 'MEDIUM':
        return 'text-orange-600 dark:text-orange-400';
      case 'LOW':
        return 'text-green-600 dark:text-green-400';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="card p-8 max-w-md w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-dark-card">
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">
            {detection.id}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-light-surface dark:hover:bg-dark-surface rounded transition-colors"
          >
            <X size={24} className="text-light-text dark:text-dark-text" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
              Classification
            </p>
            <p className="font-semibold text-light-text dark:text-dark-text">
              {detection.classification}
            </p>
          </div>

          <div>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
              Confidence
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-light-border dark:bg-dark-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-red-500"
                  style={{ width: `${detection.confidence * 100}%` }}
                ></div>
              </div>
              <span className="font-semibold text-light-text dark:text-dark-text">
                {(detection.confidence * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
              Risk Level
            </p>
            <p className={`font-bold text-lg ${getRiskColor(detection.risk)}`}>
              {detection.risk}
            </p>
          </div>

          <div>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
              Survey
            </p>
            <p className="font-semibold text-ocean-blue dark:text-cyan">
              {detection.survey}
            </p>
          </div>

          <div>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
              Coordinates
            </p>
            <p className="text-sm text-light-text dark:text-dark-text font-mono">
              {detection.coordinates}
            </p>
          </div>

          <div>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
              Detected At
            </p>
            <p className="text-sm text-light-text dark:text-dark-text">
              {detection.timestamp}
            </p>
          </div>

          <div>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
              Object Size
            </p>
            <p className="text-sm text-light-text dark:text-dark-text">
              {detection.objectSize}
            </p>
          </div>
        </div>

        <div className="h-px bg-light-border dark:bg-dark-border my-6"></div>

        <div className="mb-6">
          <p className="text-sm font-medium text-light-text dark:text-dark-text mb-3">
            Analyst Review
          </p>
          <div className="space-y-2">
            <button
              onClick={() => setStatus('Verified')}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${
                status === 'Verified'
                  ? 'bg-green-600 text-white'
                  : 'bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text hover:bg-light-border dark:hover:bg-dark-border'
              }`}
            >
              ✓ Confirm
            </button>
            <button
              onClick={() => setStatus('Rejected')}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${
                status === 'Rejected'
                  ? 'bg-red-600 text-white'
                  : 'bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text hover:bg-light-border dark:hover:bg-dark-border'
              }`}
            >
              ✗ Reject
            </button>
            <button
              onClick={() => setStatus('Review')}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${
                status === 'Review'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text hover:bg-light-border dark:hover:bg-dark-border'
              }`}
            >
              ⊙ Needs Review
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full btn-secondary"
        >
          Close
        </button>
      </div>
    </div>
  );
}
