import { useState } from 'react';
import { detections } from '../../data/mockData';
import { Search } from 'lucide-react';

export default function DetectionTable({ onSelectDetection }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');

  const filteredDetections = detections.filter((detection) => {
    const matchesSearch = detection.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      detection.classification.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = riskFilter === 'All' || detection.risk === riskFilter;
    return matchesSearch && matchesRisk;
  });

  return (
    <div className="card p-6">
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-light-text-secondary dark:text-dark-text-secondary" />
          <input
            type="text"
            placeholder="Search detections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex gap-2">
          <button className={`badge px-4 py-2 cursor-pointer transition-all ${
            riskFilter === 'All' ?
            'bg-ocean-blue/20 dark:bg-cyan/20 text-ocean-blue dark:text-cyan' :
            'bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text hover:bg-light-border dark:hover:bg-dark-border'
          }`} onClick={() => setRiskFilter('All')}>
            All
          </button>
          <button className={`badge px-4 py-2 cursor-pointer transition-all ${
            riskFilter === 'HIGH' ?
            'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
            'bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text hover:bg-light-border dark:hover:bg-dark-border'
          }`} onClick={() => setRiskFilter('HIGH')}>
            High Risk
          </button>
          <button className={`badge px-4 py-2 cursor-pointer transition-all ${
            riskFilter === 'MEDIUM' ?
            'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
            'bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text hover:bg-light-border dark:hover:bg-dark-border'
          }`} onClick={() => setRiskFilter('MEDIUM')}>
            Medium
          </button>
          <button className={`badge px-4 py-2 cursor-pointer transition-all ${
            riskFilter === 'LOW' ?
            'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
            'bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text hover:bg-light-border dark:hover:bg-dark-border'
          }`} onClick={() => setRiskFilter('LOW')}>
            Low
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table">
          <thead className="table-header">
            <tr>
              <th>ID</th>
              <th>Classification</th>
              <th>Confidence</th>
              <th>Risk</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody className="table-body">
            {filteredDetections.map((detection) => (
              <tr
                key={detection.id}
                onClick={() => onSelectDetection?.(detection)}
                className="cursor-pointer"
              >
                <td className="font-medium text-ocean-blue dark:text-cyan">{detection.id}</td>
                <td>{detection.classification}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-light-border dark:bg-dark-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-400 to-red-500"
                        style={{ width: `${detection.confidence * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{(detection.confidence * 100).toFixed(1)}%</span>
                  </div>
                </td>
                <td>
                  <span className={`badge text-xs ${
                    detection.risk === 'HIGH' ? 'badge-high' :
                    detection.risk === 'MEDIUM' ? 'badge-medium' :
                    'badge-low'
                  }`}>
                    {detection.risk}
                  </span>
                </td>
                <td>
                  <span className={`text-sm font-medium ${
                    detection.status === 'Verified' ? 'text-green-600 dark:text-green-400' :
                    'text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {detection.status}
                  </span>
                </td>
                <td>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDetection?.(detection);
                    }}
                    className="text-ocean-blue dark:text-cyan hover:text-blue-600 dark:hover:text-cyan/80 font-medium text-sm"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredDetections.length === 0 && (
        <div className="text-center py-12">
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            No detections found
          </p>
        </div>
      )}
    </div>
  );
}
