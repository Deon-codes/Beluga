import { useState } from 'react';
import { surveys } from '../../data/mockData';
import { Search } from 'lucide-react';

export default function SurveyTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date');

  const filteredSurveys = surveys.filter((survey) => {
    const matchesSearch = survey.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      survey.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || survey.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="card p-6">
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-light-text-secondary dark:text-dark-text-secondary" />
          <input
            type="text"
            placeholder="Search surveys..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
          >
            <option>All</option>
            <option>Processed</option>
            <option>Processing</option>
            <option>Pending</option>
            <option>Failed</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input"
          >
            <option value="date">Date ↓</option>
            <option value="date-asc">Date ↑</option>
            <option value="id">ID</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table">
          <thead className="table-header">
            <tr>
              <th>ID</th>
              <th>Location</th>
              <th>Date</th>
              <th>Detections</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody className="table-body">
            {filteredSurveys.map((survey) => (
              <tr key={survey.id}>
                <td className="font-medium text-ocean-blue dark:text-cyan">{survey.id}</td>
                <td>{survey.location}</td>
                <td className="text-light-text-secondary dark:text-dark-text-secondary">{survey.date}</td>
                <td>
                  {survey.status === 'Processed' ?
                    <span className="font-medium">{survey.detections}</span> :
                    <span className="text-light-text-secondary dark:text-dark-text-secondary">--</span>
                  }
                </td>
                <td>
                  <span className={`badge text-xs ${
                    survey.status === 'Processed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                    survey.status === 'Processing' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                    'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
                  }`}>
                    {survey.status}
                  </span>
                </td>
                <td>
                  <button className="text-ocean-blue dark:text-cyan hover:text-blue-600 dark:hover:text-cyan/80 font-medium text-sm">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredSurveys.length === 0 && (
        <div className="text-center py-12">
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            No surveys found
          </p>
        </div>
      )}
    </div>
  );
}
