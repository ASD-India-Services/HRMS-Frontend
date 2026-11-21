import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';

interface ImportResult {
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
}

const CSV_HEADERS =
  'employee_id,first_name,last_name,email,phone,department,designation,employment_type,date_of_joining,status';

export default function BulkImportExport() {
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // ─── Export ──────────────────────────────────────────────────────────────────

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const response = await api.get('/api/v1/employees/export/', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'employees_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setExportError('Failed to export employees. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // ─── Import ──────────────────────────────────────────────────────────────────

  const importMutation = useMutation({
    mutationFn: async (csvFile: File) => {
      const formData = new FormData();
      formData.append('file', csvFile);
      const response = await api.post<ImportResult>(
        '/api/v1/employees/import/',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return response.data;
    },
    onSuccess: (data) => setImportResult(data),
  });

  // ─── Download Template ───────────────────────────────────────────────────────

  const handleDownloadTemplate = () => {
    const blob = new Blob([CSV_HEADERS + '\n'], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'employee_import_template.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setImportResult(null);
    importMutation.reset();
  };

  const handleUpload = () => {
    if (file) importMutation.mutate(file);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-primary">
          Employee Import / Export
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Bulk import employees from a CSV file or export the current employee
          list.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ─── Export Card ─────────────────────────────────────────── */}
        <div className="rounded-lg border border-divider bg-surface-paper p-6">
          <h2 className="text-lg font-semibold text-ink-primary">
            Export Employees
          </h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Download a CSV file containing all employee records. This can be
            used as a backup or to edit records in bulk.
          </p>
          <div className="mt-4">
            <Button type="button"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? 'Exporting...' : 'Download CSV'}
            </Button>
            {exportError && (
              <p className="mt-2 text-sm text-error-main">{exportError}</p>
            )}
          </div>
        </div>

        {/* ─── Import Card ─────────────────────────────────────────── */}
        <div className="rounded-lg border border-divider bg-surface-paper p-6">
          <h2 className="text-lg font-semibold text-ink-primary">
            Import Employees
          </h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Upload a CSV file to create or update employees in bulk. Existing
            employees (matched by email) will be updated.
          </p>

          <div className="mt-4 space-y-3">
            <button
              onClick={handleDownloadTemplate}
              className="text-sm font-medium text-primary-main hover:text-primary-dark underline"
            >
              Download CSV Template
            </button>

            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block text-sm text-ink-secondary file:mr-4 file:rounded file:border-0 file:bg-primary-lighter file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-dark hover:file:bg-primary-lighter"
              />
              <Button type="button"
                onClick={handleUpload}
                disabled={!file || importMutation.isPending}
              >
                {importMutation.isPending ? 'Uploading...' : 'Upload'}
              </Button>
            </div>

            {importMutation.isError && (
              <p className="text-sm text-error-main">
                Upload failed. Please check your file and try again.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Results ────────────────────────────────────────────────── */}
      {importResult && (
        <div className="mt-6 rounded-lg border border-divider bg-surface-paper p-6">
          <h3 className="text-lg font-semibold text-ink-primary">
            Import Results
          </h3>
          <div className="mt-3 flex gap-6">
            <div className="rounded-md bg-success-lighter px-4 py-2">
              <span className="text-sm font-medium text-success-dark">
                Created: {importResult.created}
              </span>
            </div>
            <div className="rounded-md bg-primary-lighter px-4 py-2">
              <span className="text-sm font-medium text-primary-dark">
                Updated: {importResult.updated}
              </span>
            </div>
            {importResult.errors.length > 0 && (
              <div className="rounded-md bg-error-lighter px-4 py-2">
                <span className="text-sm font-medium text-error-dark">
                  Errors: {importResult.errors.length}
                </span>
              </div>
            )}
          </div>

          {importResult.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-ink-primary">
                Error Details
              </h4>
              <div className="mt-2 overflow-auto rounded-md border border-error-light">
                <table className="min-w-full divide-y divide-error-light text-sm">
                  <thead className="bg-error-lighter">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-error-dark">
                        Row
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-error-dark">
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-error-lighter">
                    {importResult.errors.map((err, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-error-dark">{err.row}</td>
                        <td className="px-4 py-2 text-error-dark">
                          {err.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
