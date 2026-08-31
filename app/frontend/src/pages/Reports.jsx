import { useState } from 'react';
import ReportTable from '../components/reports/ReportTable';
import ReportPreview from '../components/reports/ReportPreview';

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState(null);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="mb-2 text-4xl font-bold">
          Reports
        </h1>
        <p className="text-slate-400">
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
