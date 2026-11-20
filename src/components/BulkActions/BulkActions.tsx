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
          <Button variant="outlined" color="inherit"
            type="button"
            onClick={handleExport}
            disabled={exporting}
            aria-label="Export CSV"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        )}

        {/* Import Button */}
        {showImport && (
          <button
            type="button"
            onClick={() => {
              setShowImportPanel((v) => !v);
              setImportResult(null);
            }}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium shadow-sm ${
              showImportPanel
                ? 'border-primary-light bg-primary-lighter text-primary-dark'
                : 'border-divider bg-surface-paper text-ink-primary hover:bg-surface-neutral'
            }`}
            aria-expanded={showImportPanel}
            aria-label="Import CSV"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
              />
            </svg>
            Import CSV
          </button>
        )}

        {/* Template Link */}
        {showImport && (
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="text-sm font-medium text-primary-main hover:text-primary-main underline"
          >
            Download Template
          </button>
        )}

        {/* Export Error */}
        {exportError && (
          <span className="text-sm text-red-600">{exportError}</span>
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
            <p className="mt-2 text-sm text-red-600">
              Upload failed. Please check your file format and try again.
            </p>
          )}

          {/* Import Results */}
          {importResult && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800">
                  Created: {importResult.created}
                </span>
                <span className="inline-flex items-center rounded-md bg-primary-lighter px-2.5 py-1 text-xs font-medium text-primary-dark">
                  Updated: {importResult.updated}
                </span>
                {importResult.errors.length > 0 && (
                  <span className="inline-flex items-center rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800">
                    Errors: {importResult.errors.length}
                  </span>
                )}
              </div>

              {importResult.errors.length > 0 && (
                <div className="mt-2 max-h-40 overflow-auto rounded-md border border-red-200">
                  <table className="min-w-full divide-y divide-red-200 text-xs">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-medium text-red-800">Row</th>
                        <th className="px-3 py-1.5 text-left font-medium text-red-800">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100">
                      {importResult.errors.map((err, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-1.5 text-red-700">{err.row}</td>
                          <td className="px-3 py-1.5 text-red-700">{err.message}</td>
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
