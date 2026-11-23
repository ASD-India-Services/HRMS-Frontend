import { useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Iconify } from '@/components/Iconify';

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
    <PageContainer>
      <PageHeader
        title="Attendance Bulk Upload"
        subtitle="Download the format template, fill in your employee attendance records, and upload the CSV file."
        actions={
          <Button onClick={downloadSampleTemplate} startIcon={<Iconify icon="download" />}>
            Download Sample Template (.CSV)
          </Button>
        }
      />

      <Card>
        <CardContent>
          <h2 className="mb-4 text-base font-semibold text-ink-primary">Select Attendance CSV File</h2>

          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <input
              type="file"
              accept=".csv"
              aria-label="Attendance CSV file"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              className="block w-full cursor-pointer text-sm text-ink-secondary transition-colors file:mr-4 file:cursor-pointer file:rounded file:border-0 file:bg-primary-main/10 file:px-4 file:py-2 file:text-sm file:font-bold file:text-primary-dark hover:file:bg-primary-main/20 sm:w-auto"
            />

            <div className="flex items-center gap-2">
              <Button onClick={handleUpload} disabled={!file || !!formatWarning} loading={uploading}>
                {uploading ? 'Uploading...' : 'Upload Attendance Records'}
              </Button>
              {file && (
                <Button variant="outlined" color="inherit" onClick={handleReset}>
                  Clear
                </Button>
              )}
            </div>
          </div>

          {formatWarning && (
            <div className="mt-4 flex items-center gap-2 rounded bg-warning-main/10 p-3 text-sm text-warning-dark">
              <Iconify icon="warning" width={20} className="shrink-0" />
              {formatWarning}
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded bg-error-main/10 p-3 text-sm text-error-dark">
              <Iconify icon="error" width={20} className="shrink-0" />
              {error}
            </div>
          )}

          {file && previewHeaders.length > 0 && !result && (
            <div className="mt-6 border-t border-divider/20 pt-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold text-ink-primary">
                  Preview File: <span className="font-normal text-ink-secondary">{file.name}</span>
                </div>
                <span className="text-xs font-medium text-ink-secondary">
                  {totalDetectedRows} total records found (showing first {previewRows.length})
                </span>
              </div>

              <div className="overflow-x-auto rounded border border-divider/20">
                <table className="min-w-full divide-y divide-divider/20 text-xs">
                  <thead className="bg-surface-neutral">
                    <tr>
                      {previewHeaders.map((head, i) => (
                        <th key={i} className="px-3 py-2 text-left font-semibold tracking-wider text-ink-secondary">
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider/20 bg-surface-paper">
                    {previewRows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-grey-500/10">
                        {previewHeaders.map((_, colIdx) => (
                          <td key={colIdx} className="whitespace-nowrap px-3 py-2 text-ink-secondary">
                            {row[colIdx] || <span className="italic text-ink-disabled">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result && (
            <div className="mt-6 border-t border-divider/20 pt-6">
              <h3 className="mb-3 text-sm font-semibold text-ink-primary">Upload Summary</h3>

              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-card bg-surface-neutral p-4">
                  <div className="text-xs font-medium text-ink-secondary">Total Rows</div>
                  <div className="mt-1 text-2xl font-bold text-ink-primary">{result.total}</div>
                </div>
                <div className="rounded-card bg-success-main/10 p-4">
                  <div className="text-xs font-medium text-success-dark">Successfully Imported</div>
                  <div className="mt-1 text-2xl font-bold text-success-dark">{result.success}</div>
                </div>
                <div className="rounded-card bg-error-main/10 p-4">
                  <div className="text-xs font-medium text-error-dark">Failed / Skipped</div>
                  <div className="mt-1 text-2xl font-bold text-error-dark">{result.failed}</div>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-error-dark">
                    Validation Errors ({result.errors.length})
                  </h4>
                  <div className="overflow-x-auto rounded border border-error-main/30">
                    <table className="min-w-full divide-y divide-error-main/20 text-xs">
                      <thead className="bg-error-main/10">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-error-dark">Row</th>
                          <th className="px-3 py-2 text-left font-semibold text-error-dark">Field</th>
                          <th className="px-3 py-2 text-left font-semibold text-error-dark">Message</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-divider/20 bg-surface-paper">
                        {result.errors.map((errItem, idx) => (
                          <tr key={idx} className="hover:bg-error-main/5">
                            <td className="whitespace-nowrap px-3 py-2 font-mono text-ink-secondary">
                              {errItem.row ? `Row ${errItem.row}` : '—'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 font-mono text-ink-secondary">
                              {errItem.field || '—'}
                            </td>
                            <td className="px-3 py-2 font-medium text-error-main">{errItem.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <Button color="inherit" onClick={handleReset}>
                  Upload Another File
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
