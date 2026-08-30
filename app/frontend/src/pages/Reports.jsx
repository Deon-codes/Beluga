import { useState } from 'react';
import ReportTable from '../components/reports/ReportTable';
import ReportPreview from '../components/reports/ReportPreview';

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState(null);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-light-text dark:text-dark-text mb-2">
          Reports
        </h1>
        <p className="text-light-text-secondary dark:text-dark-text-secondary">
          Survey analysis and detection reports
        </p>
      </div>

      <ReportTable onViewReport={setSelectedReport} />

      {selectedReport && (
        <ReportPreview
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
}
