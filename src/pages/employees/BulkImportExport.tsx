import { HRMSTable } from '@/components/DataTable/HRMSTable';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Iconify } from '@/components/Iconify';

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
    <PageContainer>
      {/* Page Header */}
      <PageHeader
        title="Employee Import / Export"
        subtitle="Bulk import employees from a CSV file or export the current employee list."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ─── Export Card ─────────────────────────────────────────── */}
        <Card>
          <CardHeader
            title="Export Employees"
            subtitle="Download a CSV file containing all employee records. This can be used as a backup or to edit records in bulk."
          />
          <CardContent>
            <Button
              onClick={handleExport}
              disabled={exporting}
              startIcon={<Iconify icon="download" />}
            >
              {exporting ? 'Exporting...' : 'Download CSV'}
            </Button>
            {exportError && (
              <p className="mt-2 text-sm text-error-main">{exportError}</p>
            )}
          </CardContent>
        </Card>

        {/* ─── Import Card ─────────────────────────────────────────── */}
        <Card>
          <CardHeader
            title="Import Employees"
            subtitle="Upload a CSV file to create or update employees in bulk. Existing employees (matched by email) will be updated."
          />
          <CardContent className="space-y-3">
            <Button variant="text" size="small" className="-ml-2.5" onClick={handleDownloadTemplate} startIcon={<Iconify icon="download" />}>
              Download CSV Template
            </Button>

            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block text-sm text-ink-secondary file:mr-4 file:rounded file:border-0 file:bg-primary-lighter file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-dark hover:file:bg-primary-lighter"
              />
              <Button
                onClick={handleUpload}
                disabled={!file || importMutation.isPending}
                startIcon={<Iconify icon="upload" />}
              >
                {importMutation.isPending ? 'Uploading...' : 'Upload'}
              </Button>
            </div>

            {importMutation.isError && (
              <p className="text-sm text-error-main">
                Upload failed. Please check your file and try again.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      {/* ─── Results ────────────────────────────────────────────────── */}
      {importResult && (
        <Card className="mt-6">
          <CardHeader title="Import Results" />
          <CardContent>
          <div className="flex gap-6">
            <div className="rounded-lg bg-success-lighter px-4 py-2">
              <span className="text-sm font-medium text-success-dark">
                Created: {importResult.created}
              </span>
            </div>
            <div className="rounded-lg bg-primary-lighter px-4 py-2">
              <span className="text-sm font-medium text-primary-dark">
                Updated: {importResult.updated}
              </span>
            </div>
            {importResult.errors.length > 0 && (
              <div className="rounded-lg bg-error-lighter px-4 py-2">
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
              <div className="mt-2 overflow-auto rounded-lg bg-error-lighter/40">
                <HRMSTable className="min-w-full divide-y divide-error-light text-sm">
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
                </HRMSTable>
              </div>
            </div>
          )}
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
