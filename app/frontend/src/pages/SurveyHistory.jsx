import SurveyTable from '../components/surveys/SurveyTable';

export default function SurveyHistory() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="mb-2 text-4xl font-bold">
          Survey History
        </h1>
        <p className="text-slate-400">
          View all processed and ongoing surveys
        </p>
      </div>

      <SurveyTable />
    </div>
  );
}
