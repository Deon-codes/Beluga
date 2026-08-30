import { reports } from '../../data/mockData';
import { Download, Eye, FileCheck, ShieldCheck } from 'lucide-react';

export default function ReportTable({ onViewReport }) {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-light-border dark:border-dark-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-light-text dark:text-dark-text flex items-center gap-2">
            <FileCheck className="text-ocean-blue dark:text-cyan" size={22} />
            Hydrographic Survey & AI Analysis Reports
          </h2>
          <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">
            Generated inspection documentation, hazard classifications, and eco-cleanup plans
          </p>
        </div>

        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 self-start sm:self-auto flex items-center gap-1">
          <ShieldCheck size={14} /> Official Hydrographic Archive
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="p-3">Report ID</th>
              <th className="p-3">Survey Reference</th>
              <th className="p-3">Generated Date</th>
              <th className="p-3">Detections</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {reports.map((report) => (
              <tr key={report.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                  {report.id}
                </td>
                <td className="p-3 font-medium text-ocean-blue dark:text-cyan">
                  {report.survey}
                </td>
                <td className="p-3 text-slate-600 dark:text-slate-300">{report.date}</td>
                <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                  {report.detections} targets
                </td>
                <td className="p-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    {report.status}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onViewReport?.(report)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-ocean-blue/10 dark:bg-cyan/10 text-ocean-blue dark:text-cyan hover:bg-ocean-blue/20 dark:hover:bg-cyan/20 transition-all flex items-center gap-1.5"
                    >
                      <Eye size={15} /> View Report
                    </button>
                    <button
                      onClick={() => onViewReport?.(report)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-ocean-blue dark:hover:text-cyan hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Download PDF"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
