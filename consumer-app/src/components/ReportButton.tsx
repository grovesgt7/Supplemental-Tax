import { useState } from 'react';
import { openPrintReport, type ReportData } from '../lib/report';

/** Opens the printable report in a new tab, where it can be saved as a PDF. */
export default function ReportButton({ report }: { report: ReportData }) {
  const [blocked, setBlocked] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setBlocked(!openPrintReport(report))}
        className="btn-primary"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3 3m0 0l-3-3m3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
        Save report (PDF / print)
      </button>
      {blocked && (
        <p className="mt-2 text-sm text-amber-700">
          Your browser blocked the report pop-up — allow pop-ups for this site and try again.
        </p>
      )}
    </div>
  );
}
