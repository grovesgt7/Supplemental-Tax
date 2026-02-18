import { useState, useRef, useCallback } from 'react';
import { uploadPdf, uploadSpreadsheet, importData } from '../api/client';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface ParsedRow {
  [key: string]: string | number | boolean | null;
}

export default function DocumentUpload() {
  // PDF state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfStatus, setPdfStatus] = useState<UploadStatus>('idle');
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfResult, setPdfResult] = useState<Record<string, unknown> | null>(null);
  const [pdfDragging, setPdfDragging] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Spreadsheet state
  const [spreadsheetFile, setSpreadsheetFile] = useState<File | null>(null);
  const [spreadsheetStatus, setSpreadsheetStatus] = useState<UploadStatus>('idle');
  const [spreadsheetError, setSpreadsheetError] = useState<string | null>(null);
  const [spreadsheetData, setSpreadsheetData] = useState<ParsedRow[] | null>(null);
  const [spreadsheetColumns, setSpreadsheetColumns] = useState<string[]>([]);
  const [spreadsheetDragging, setSpreadsheetDragging] = useState(false);
  const [importType, setImportType] = useState<'clients' | 'properties' | 'bills'>('bills');
  const [importStatus, setImportStatus] = useState<UploadStatus>('idle');
  const [importResult, setImportResult] = useState<{ imported: number } | null>(null);
  const spreadsheetInputRef = useRef<HTMLInputElement>(null);

  // PDF handlers
  const handlePdfDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setPdfDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setPdfResult(null);
      setPdfError(null);
    } else {
      setPdfError('Please upload a PDF file.');
    }
  }, []);

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFile(file);
      setPdfResult(null);
      setPdfError(null);
    }
  };

  async function handlePdfUpload() {
    if (!pdfFile) return;
    setPdfStatus('uploading');
    setPdfError(null);
    try {
      const result = await uploadPdf(pdfFile);
      setPdfResult(result);
      setPdfStatus('success');
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'Upload failed');
      setPdfStatus('error');
    }
  }

  // Spreadsheet handlers
  const handleSpreadsheetDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setSpreadsheetDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      const valid = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];
      if (valid.includes(file.type) || file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setSpreadsheetFile(file);
        setSpreadsheetData(null);
        setSpreadsheetError(null);
        setImportResult(null);
      } else {
        setSpreadsheetError('Please upload a CSV or Excel file.');
      }
    }
  }, []);

  const handleSpreadsheetSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSpreadsheetFile(file);
      setSpreadsheetData(null);
      setSpreadsheetError(null);
      setImportResult(null);
    }
  };

  async function handleSpreadsheetUpload() {
    if (!spreadsheetFile) return;
    setSpreadsheetStatus('uploading');
    setSpreadsheetError(null);
    try {
      const result = await uploadSpreadsheet(spreadsheetFile);
      const rows = (result.data || result.rows || []) as ParsedRow[];
      const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
      setSpreadsheetData(rows);
      setSpreadsheetColumns(cols);
      setSpreadsheetStatus('success');
    } catch (err) {
      setSpreadsheetError(err instanceof Error ? err.message : 'Upload failed');
      setSpreadsheetStatus('error');
    }
  }

  async function handleImport() {
    if (!spreadsheetData || spreadsheetData.length === 0) return;
    setImportStatus('uploading');
    try {
      const result = await importData(spreadsheetData as Record<string, unknown>[], importType);
      setImportResult(result);
      setImportStatus('success');
    } catch (err) {
      setSpreadsheetError(err instanceof Error ? err.message : 'Import failed');
      setImportStatus('error');
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* PDF Upload Section */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-800">PDF Upload</h3>
            <p className="text-sm text-gray-500">Upload a supplemental tax bill PDF for automatic data extraction</p>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setPdfDragging(true); }}
          onDragLeave={() => setPdfDragging(false)}
          onDrop={handlePdfDrop}
          onClick={() => pdfInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            pdfDragging
              ? 'border-primary-400 bg-primary-50'
              : pdfFile
              ? 'border-emerald-300 bg-emerald-50/50'
              : 'border-gray-300 bg-gray-50/50 hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf"
            onChange={handlePdfSelect}
            className="hidden"
          />

          {pdfFile ? (
            <div className="flex items-center justify-center gap-3">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800">{pdfFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(pdfFile.size / 1024).toFixed(1)} KB -- Click or drag to replace
                </p>
              </div>
            </div>
          ) : (
            <>
              <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-sm text-gray-600 font-medium">Drag and drop a PDF file here, or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">Supplemental tax bill PDFs only (.pdf)</p>
            </>
          )}
        </div>

        {/* PDF Upload Button */}
        {pdfFile && !pdfResult && (
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handlePdfUpload}
              disabled={pdfStatus === 'uploading'}
              className="btn-primary"
            >
              {pdfStatus === 'uploading' ? (
                <>
                  <div className="spinner w-4 h-4" />
                  Uploading & Processing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  Upload & Extract Data
                </>
              )}
            </button>
            <button
              onClick={() => {
                setPdfFile(null);
                setPdfError(null);
                setPdfStatus('idle');
              }}
              className="btn-secondary"
            >
              Remove
            </button>
          </div>
        )}

        {/* PDF Error */}
        {pdfError && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700">{pdfError}</p>
          </div>
        )}

        {/* PDF Results */}
        {pdfResult && (
          <div className="mt-4 space-y-3">
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
              <p className="text-sm text-emerald-700 font-medium">
                PDF processed successfully. Extracted data shown below.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(pdfResult, null, 2)}
              </pre>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  // Navigate to create bill -- in a real app this would pass extracted data
                  window.location.href = '/bills';
                }}
                className="btn-success"
              >
                Create Bill from Extracted Data
              </button>
              <button
                onClick={() => {
                  setPdfFile(null);
                  setPdfResult(null);
                  setPdfStatus('idle');
                }}
                className="btn-secondary"
              >
                Upload Another
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Spreadsheet Import Section */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125m0 0h-7.5" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-800">Spreadsheet Import</h3>
            <p className="text-sm text-gray-500">Upload CSV or Excel files to bulk-import data</p>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setSpreadsheetDragging(true); }}
          onDragLeave={() => setSpreadsheetDragging(false)}
          onDrop={handleSpreadsheetDrop}
          onClick={() => spreadsheetInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            spreadsheetDragging
              ? 'border-primary-400 bg-primary-50'
              : spreadsheetFile
              ? 'border-emerald-300 bg-emerald-50/50'
              : 'border-gray-300 bg-gray-50/50 hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          <input
            ref={spreadsheetInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleSpreadsheetSelect}
            className="hidden"
          />

          {spreadsheetFile ? (
            <div className="flex items-center justify-center gap-3">
              <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375" />
              </svg>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800">{spreadsheetFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(spreadsheetFile.size / 1024).toFixed(1)} KB -- Click or drag to replace
                </p>
              </div>
            </div>
          ) : (
            <>
              <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-sm text-gray-600 font-medium">Drag and drop a spreadsheet here, or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">CSV, XLS, or XLSX files</p>
            </>
          )}
        </div>

        {/* Upload Button */}
        {spreadsheetFile && !spreadsheetData && (
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleSpreadsheetUpload}
              disabled={spreadsheetStatus === 'uploading'}
              className="btn-primary"
            >
              {spreadsheetStatus === 'uploading' ? (
                <>
                  <div className="spinner w-4 h-4" />
                  Uploading & Parsing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  Upload & Parse
                </>
              )}
            </button>
            <button
              onClick={() => {
                setSpreadsheetFile(null);
                setSpreadsheetError(null);
                setSpreadsheetStatus('idle');
              }}
              className="btn-secondary"
            >
              Remove
            </button>
          </div>
        )}

        {/* Spreadsheet Error */}
        {spreadsheetError && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700">{spreadsheetError}</p>
          </div>
        )}

        {/* Data Preview */}
        {spreadsheetData && spreadsheetData.length > 0 && (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
              <p className="text-sm text-emerald-700 font-medium">
                Parsed {spreadsheetData.length} row{spreadsheetData.length !== 1 ? 's' : ''} with {spreadsheetColumns.length} column{spreadsheetColumns.length !== 1 ? 's' : ''}.
              </p>
            </div>

            {/* Preview Table */}
            <div className="table-container max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0">
                  <tr>
                    <th className="table-header">#</th>
                    {spreadsheetColumns.map((col) => (
                      <th key={col} className="table-header">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {spreadsheetData.slice(0, 20).map((row, i) => (
                    <tr key={i} className="table-row">
                      <td className="table-cell text-gray-400">{i + 1}</td>
                      {spreadsheetColumns.map((col) => (
                        <td key={col} className="table-cell">
                          {row[col] != null ? String(row[col]) : '--'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {spreadsheetData.length > 20 && (
                <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-100">
                  Showing 20 of {spreadsheetData.length} rows
                </div>
              )}
            </div>

            {/* Import Controls */}
            <div className="flex items-center gap-4">
              <div className="min-w-[180px]">
                <label className="input-label">Import As</label>
                <select
                  value={importType}
                  onChange={(e) => setImportType(e.target.value as typeof importType)}
                  className="select"
                >
                  <option value="bills">Bills</option>
                  <option value="clients">Clients</option>
                  <option value="properties">Properties</option>
                </select>
              </div>
              <div className="pt-6">
                <button
                  onClick={handleImport}
                  disabled={importStatus === 'uploading'}
                  className="btn-success"
                >
                  {importStatus === 'uploading' ? (
                    <>
                      <div className="spinner w-4 h-4" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Import {spreadsheetData.length} Rows
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Import Result */}
            {importResult && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                <p className="text-sm text-emerald-700 font-medium">
                  Successfully imported {importResult.imported} record{importResult.imported !== 1 ? 's' : ''}.
                </p>
              </div>
            )}

            {/* Reset */}
            <button
              onClick={() => {
                setSpreadsheetFile(null);
                setSpreadsheetData(null);
                setSpreadsheetColumns([]);
                setSpreadsheetStatus('idle');
                setImportStatus('idle');
                setImportResult(null);
                setSpreadsheetError(null);
              }}
              className="btn-secondary"
            >
              Upload Another File
            </button>
          </div>
        )}

        {spreadsheetData && spreadsheetData.length === 0 && (
          <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-sm text-amber-700">The file appears to be empty or could not be parsed.</p>
          </div>
        )}
      </div>
    </div>
  );
}
