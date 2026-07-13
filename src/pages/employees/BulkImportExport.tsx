import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

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
        <h1 className="text-2xl font-bold text-gray-900">
          Employee Import / Export
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Bulk import employees from a CSV file or export the current employee
          list.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ─── Export Card ─────────────────────────────────────────── */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Export Employees
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Download a CSV file containing all employee records. This can be
            used as a backup or to edit records in bulk.
          </p>
          <div className="mt-4">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : 'Download CSV'}
            </button>
            {exportError && (
              <p className="mt-2 text-sm text-red-600">{exportError}</p>
            )}
          </div>
        </div>

        {/* ─── Import Card ─────────────────────────────────────────── */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Import Employees
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Upload a CSV file to create or update employees in bulk. Existing
            employees (matched by email) will be updated.
          </p>

          <div className="mt-4 space-y-3">
            <button
              onClick={handleDownloadTemplate}
              className="text-sm font-medium text-primary-600 hover:text-primary-500 underline"
            >
              Download CSV Template
            </button>

            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block text-sm text-gray-500 file:mr-4 file:rounded file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-700 hover:file:bg-primary-100"
              />
              <button
                onClick={handleUpload}
                disabled={!file || importMutation.isPending}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
              >
                {importMutation.isPending ? 'Uploading...' : 'Upload'}
              </button>
            </div>

            {importMutation.isError && (
              <p className="text-sm text-red-600">
                Upload failed. Please check your file and try again.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Results ────────────────────────────────────────────────── */}
      {importResult && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Import Results
          </h3>
          <div className="mt-3 flex gap-6">
            <div className="rounded-md bg-green-50 px-4 py-2">
              <span className="text-sm font-medium text-green-800">
                Created: {importResult.created}
              </span>
            </div>
            <div className="rounded-md bg-blue-50 px-4 py-2">
              <span className="text-sm font-medium text-blue-800">
                Updated: {importResult.updated}
              </span>
            </div>
            {importResult.errors.length > 0 && (
              <div className="rounded-md bg-red-50 px-4 py-2">
                <span className="text-sm font-medium text-red-800">
                  Errors: {importResult.errors.length}
                </span>
              </div>
            )}
          </div>

          {importResult.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700">
                Error Details
              </h4>
              <div className="mt-2 overflow-auto rounded-md border border-red-200">
                <table className="min-w-full divide-y divide-red-200 text-sm">
                  <thead className="bg-red-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-red-800">
                        Row
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-red-800">
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {importResult.errors.map((err, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-red-700">{err.row}</td>
                        <td className="px-4 py-2 text-red-700">
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
