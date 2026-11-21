/**
 * BulkActions — Reusable import/export toolbar for list pages.
 * Shows Import and Export buttons that expand into inline panels.
 * Permission-gated via useHrmsPermissionsContext.
 */

import { useState, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { useHrmsPermissionsContext } from '@/contexts/HrmsPermissionsContext';
import { Button } from '@/components/ui/Button';
import { Iconify } from '@/components/Iconify';

interface ImportResult {
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
}

export interface BulkActionsProps {
  /** API endpoint for CSV export (GET) */
  exportEndpoint: string;
  /** API endpoint for CSV import (POST) — if omitted, import UI is hidden */
  importEndpoint?: string;
  /** CSV column headers for template download */
  csvHeaders: string;
  /** Filename for the exported CSV */
  exportFilename?: string;
  /** Permission required to export */
  exportPermission?: string;
  /** Permission required to import */
  importPermission?: string;
  /** Callback after successful import */
  onImportSuccess?: () => void;
}

export function BulkActions({
  exportEndpoint,
  importEndpoint,
  csvHeaders,
  exportFilename = 'export.csv',
  exportPermission,
  importPermission,
  onImportSuccess,
}: BulkActionsProps) {
  const { hasPermission } = useHrmsPermissionsContext();
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Permission checks
  const canExport = !exportPermission || hasPermission(exportPermission);
  const canImport = !importPermission || hasPermission(importPermission);
  const showImport = !!importEndpoint && canImport;

  // If user can't do either action, render nothing
  if (!canExport && !showImport) return null;

  // ─── Export ────────────────────────────────────────────────────────────────

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const response = await api.get(exportEndpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', exportFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setExportError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // ─── Import ────────────────────────────────────────────────────────────────

  const importMutation = useMutation({
    mutationFn: async (csvFile: File) => {
      const formData = new FormData();
      formData.append('file', csvFile);
      const response = await api.post<ImportResult>(importEndpoint!, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: (data) => {
      setImportResult(data);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onImportSuccess?.();
    },
  });

  // ─── Template Download ─────────────────────────────────────────────────────

  const handleDownloadTemplate = useCallback(() => {
    const blob = new Blob([csvHeaders + '\n'], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'import_template.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }, [csvHeaders]);

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
    <div className="space-y-3">
      {/* Toolbar Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Export Button */}
        {canExport && (
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<Iconify icon="download" />}
            onClick={handleExport}
            disabled={exporting}
            aria-label="Export CSV"
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        )}

        {/* Import Button */}
        {showImport && (
          <Button
            variant={showImportPanel ? 'soft' : 'outlined'}
            color={showImportPanel ? 'primary' : 'inherit'}
            startIcon={<Iconify icon="upload" />}
            onClick={() => {
              setShowImportPanel((v) => !v);
              setImportResult(null);
            }}
            aria-expanded={showImportPanel}
            aria-label="Import CSV"
          >
            Import CSV
          </Button>
        )}

        {/* Template Link */}
        {showImport && (
          <Button variant="text" size="small" onClick={handleDownloadTemplate}>
            Download Template
          </Button>
        )}

        {/* Export Error */}
        {exportError && (
          <span className="text-sm text-error-main">{exportError}</span>
        )}
      </div>

      {/* Import Panel (collapsible) */}
      {showImportPanel && showImport && (
        <div className="rounded-lg border border-divider bg-surface-neutral p-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block text-sm text-ink-secondary file:mr-3 file:rounded file:border-0 file:bg-primary-lighter file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary-dark hover:file:bg-primary-lighter"
              aria-label="Select CSV file to import"
            />
            <Button
              type="button"
              onClick={handleUpload}
              disabled={!file || importMutation.isPending}
            >
              {importMutation.isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </div>

          {/* Import Error */}
          {importMutation.isError && (
            <p className="mt-2 text-sm text-error-main">
              Upload failed. Please check your file format and try again.
            </p>
          )}

          {/* Import Results */}
          {importResult && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center rounded-md bg-success-lighter px-2.5 py-1 text-xs font-medium text-success-dark">
                  Created: {importResult.created}
                </span>
                <span className="inline-flex items-center rounded-md bg-primary-lighter px-2.5 py-1 text-xs font-medium text-primary-dark">
                  Updated: {importResult.updated}
                </span>
                {importResult.errors.length > 0 && (
                  <span className="inline-flex items-center rounded-md bg-error-lighter px-2.5 py-1 text-xs font-medium text-error-dark">
                    Errors: {importResult.errors.length}
                  </span>
                )}
              </div>

              {importResult.errors.length > 0 && (
                <div className="mt-2 max-h-40 overflow-auto rounded-md border border-error-light">
                  <table className="min-w-full divide-y divide-error-light text-xs">
                    <thead className="bg-error-lighter">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-medium text-error-dark">Row</th>
                        <th className="px-3 py-1.5 text-left font-medium text-error-dark">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-error-lighter">
                      {importResult.errors.map((err, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-1.5 text-error-dark">{err.row}</td>
                          <td className="px-3 py-1.5 text-error-dark">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
