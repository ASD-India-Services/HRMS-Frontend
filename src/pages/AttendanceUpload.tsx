import React, { useState } from 'react';
import api from '@/lib/api';

const ENDPOINT = '/api/v1/attendance/upload/';

interface UploadError {
  row?: number | null;
  field?: string;
  message: string;
}

interface UploadResponse {
  total: number;
  success: number;
  failed: number;
  errors?: UploadError[];
  detail?: string;
}

export default function AttendanceUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [totalDetectedRows, setTotalDetectedRows] = useState<number>(0);
  const [formatWarning, setFormatWarning] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── 1. Download Blank/Sample Template ─────────────────────────────────────
  const downloadSampleTemplate = () => {
    const csvContent = [
      'employee_id,date,status,check_in_time,check_out_time',
      'EMP-001,2026-11-19,present,09:00,18:00',
      'EMP-002,2026-11-19,present,09:15,18:30',
      'EMP-003,2026-11-19,absent,,',
      'EMP-004,2026-11-19,half_day,09:00,13:30',
      'EMP-005,2026-11-19,on_leave,,',
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'attendance_sample_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ─── 2. Handle File Selection & Parse In-Browser Preview ───────────────────
  const handleFileChange = (selectedFile: File | null) => {
    setFile(selectedFile);
    setError(null);
    setResult(null);
    setFormatWarning(null);
    setPreviewHeaders([]);
    setPreviewRows([]);
    setTotalDetectedRows(0);

    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setFormatWarning('Please select a valid .csv file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) return;

        const lines = text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        if (lines.length === 0) {
          setFormatWarning('The selected CSV file is empty.');
          return;
        }

        const headers = lines[0].split(',').map((h) => h.trim());
        setPreviewHeaders(headers);

        const requiredCols = ['employee_id', 'date', 'status'];
        const missing = requiredCols.filter((col) => !headers.includes(col));
        if (missing.length > 0) {
          setFormatWarning(
            `Missing required column(s): ${missing.join(', ')}. Please use the official template.`
          );
        }

        const dataRows = lines.slice(1).map((line) => line.split(',').map((cell) => cell.trim()));
        setTotalDetectedRows(dataRows.length);
        setPreviewRows(dataRows.slice(0, 5)); // First 5 rows for quick preview
      } catch {
        setFormatWarning('Could not read the CSV file preview.');
      }
    };
    reader.readAsText(selectedFile);
  };

  // ─── 3. Upload File to Backend ────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<UploadResponse>(ENDPOINT, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
    } catch (err: any) {
      const detailMsg = err?.response?.data?.detail || err?.message || 'Upload failed';
      setError(detailMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewHeaders([]);
    setPreviewRows([]);
    setTotalDetectedRows(0);
    setResult(null);
    setError(null);
    setFormatWarning(null);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 font-sans">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Bulk Upload</h1>
          <p className="mt-1 text-sm text-gray-600">
            Download the format template, fill in your employee attendance records, and upload the CSV file.
          </p>
        </div>

        {/* Download Template Action */}
        <div>
          <button
            onClick={downloadSampleTemplate}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12L12 16.5m0 0L16.5 12M12 16.5V3" />
            </svg>
            Download Sample Template (.CSV)
          </button>
        </div>
      </div>

      {/* Main Upload Card */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Select Attendance CSV File</h2>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            className="block w-full sm:w-auto text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-primary-700 hover:file:bg-primary-100 transition-colors cursor-pointer"
          />

          <div className="flex items-center gap-2">
            <button
              onClick={handleUpload}
              disabled={!file || uploading || !!formatWarning}
              className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Uploading...
                </>
              ) : (
                'Upload Attendance Records'
              )}
            </button>

            {file && (
              <button
                onClick={handleReset}
                type="button"
                className="rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Format Warning Notice */}
        {formatWarning && (
          <div className="mt-4 rounded-md bg-amber-50 p-3 border border-amber-200 text-sm text-amber-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {formatWarning}
          </div>
        )}

        {/* Global Error Notice */}
        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 border border-red-200 text-sm text-red-700 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* In-Browser CSV Preview */}
        {file && previewHeaders.length > 0 && !result && (
          <div className="mt-6 border-t border-gray-100 pt-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-800">
                Preview File: <span className="text-gray-600 font-normal">{file.name}</span>
              </div>
              <span className="text-xs font-medium text-gray-500">
                {totalDetectedRows} total records found (showing first {previewRows.length})
              </span>
            </div>

            <div className="overflow-x-auto rounded border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    {previewHeaders.map((head, i) => (
                      <th
                        key={i}
                        className="px-3 py-2 text-left font-semibold text-gray-700 tracking-wider"
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {previewRows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-gray-50">
                      {previewHeaders.map((_, colIdx) => (
                        <td key={colIdx} className="px-3 py-2 text-gray-600 whitespace-nowrap">
                          {row[colIdx] || <span className="text-gray-300 italic">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Results Summary Cards & Error Breakdown ──────────────────────── */}
        {result && (
          <div className="mt-6 border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Upload Summary</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                <div className="text-xs text-gray-500 font-medium">Total Rows</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{result.total}</div>
              </div>

              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
                <div className="text-xs text-emerald-700 font-medium">Successfully Imported</div>
                <div className="text-2xl font-bold text-emerald-700 mt-1">{result.success}</div>
              </div>

              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <div className="text-xs text-red-700 font-medium">Failed / Skipped</div>
                <div className="text-2xl font-bold text-red-700 mt-1">{result.failed}</div>
              </div>
            </div>

            {/* Error Details Table */}
            {result.errors && result.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-red-700 mb-2">
                  Validation Errors ({result.errors.length})
                </h4>
                <div className="overflow-x-auto rounded border border-red-200 bg-red-50/40">
                  <table className="min-w-full divide-y divide-red-200 text-xs">
                    <thead className="bg-red-100/60">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-red-900">Row</th>
                        <th className="px-3 py-2 text-left font-semibold text-red-900">Field</th>
                        <th className="px-3 py-2 text-left font-semibold text-red-900">Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100 bg-white">
                      {result.errors.map((errItem, idx) => (
                        <tr key={idx} className="hover:bg-red-50/30">
                          <td className="px-3 py-2 font-mono text-gray-600 whitespace-nowrap">
                            {errItem.row ? `Row ${errItem.row}` : '—'}
                          </td>
                          <td className="px-3 py-2 font-mono text-gray-700 whitespace-nowrap">
                            {errItem.field || '—'}
                          </td>
                          <td className="px-3 py-2 text-red-600 font-medium">
                            {errItem.message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleReset}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
              >
                Upload Another File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
