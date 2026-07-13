/**
 * TanStack Query mutation hook for exporting reports as CSV file downloads.
 *
 * Requirements: 3.5
 */

import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

interface ExportParams {
  /** API endpoint to call for the export */
  endpoint: string;
  /** Filename for the downloaded file (defaults to 'export.csv') */
  filename?: string;
  /** Optional query filters to pass as URL params */
  filters?: Record<string, string>;
}

export function useExport() {
  return useMutation({
    mutationFn: async (params: ExportParams) => {
      const response = await api.get(params.endpoint, {
        params: params.filters,
        responseType: 'blob',
      });

      // Create a temporary download link and trigger the download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', params.filename || 'export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
  });
}
