import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import { DOCUMENT_REQUESTS } from '@/lib/endpoints';
import type {
  DocumentRequest,
  DocumentRequestSummary,
  DocumentRequestFilters,
} from '@/types/documents';

interface PaginatedDocumentRequests {
  count: number;
  next: string | null;
  previous: string | null;
  results: DocumentRequest[];
}

// ─── Fetchers ────────────────────────────────────────────────────────────────

async function fetchDocumentRequests(
  filters: DocumentRequestFilters
): Promise<PaginatedDocumentRequests> {
  const params: Record<string, string | number> = {};
  if (filters.status) params.status = filters.status;
  if (filters.format) params.format = filters.format;
  if (filters.urgency) params.urgency = filters.urgency;
  if (filters.request_type) params.request_type = filters.request_type;
  if (filters.employee) params.employee = filters.employee;
  if (filters.search) params.search = filters.search;
  if (filters.page) params.page = filters.page;
  if (filters.page_size) params.page_size = filters.page_size;

  const res = await api.get<PaginatedDocumentRequests | DocumentRequest[]>(
    DOCUMENT_REQUESTS.LIST,
    { params }
  );

  if (Array.isArray(res.data)) {
    return {
      count: res.data.length,
      next: null,
      previous: null,
      results: res.data,
    };
  }

  return res.data;
}

async function fetchDocumentRequestSummary(): Promise<DocumentRequestSummary> {
  const res = await api.get<DocumentRequestSummary>(DOCUMENT_REQUESTS.SUMMARY);
  return res.data;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useDocumentRequests(filters: DocumentRequestFilters = {}) {
  return useQuery({
    queryKey: ['document-requests', filters],
    queryFn: () => fetchDocumentRequests(filters),
    placeholderData: keepPreviousData,
  });
}

export function useDocumentRequestSummary() {
  return useQuery({
    queryKey: ['document-requests-summary'],
    queryFn: fetchDocumentRequestSummary,
    staleTime: 30_000,
  });
}

export function useCreateDocumentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<DocumentRequest> & { employee_ids?: string[] }) => {
      const res = await api.post<DocumentRequest | DocumentRequest[]>(DOCUMENT_REQUESTS.CREATE, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-requests'] });
      queryClient.invalidateQueries({ queryKey: ['document-requests-summary'] });
    },
  });
}

export function useApproveDocumentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      file,
      adminNotes,
    }: {
      id: string;
      file?: File | null;
      adminNotes?: string;
    }) => {
      if (file) {
        const formData = new FormData();
        formData.append('issued_document', file);
        if (adminNotes) {
          formData.append('admin_notes', adminNotes);
        }
        const res = await api.post<DocumentRequest>(
          DOCUMENT_REQUESTS.APPROVE(id),
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
          }
        );
        return res.data;
      }

      const res = await api.post<DocumentRequest>(DOCUMENT_REQUESTS.APPROVE(id), {
        admin_notes: adminNotes,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-requests'] });
      queryClient.invalidateQueries({ queryKey: ['document-requests-summary'] });
    },
  });
}

export function useRejectDocumentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      rejectionReason,
      adminNotes,
    }: {
      id: string;
      rejectionReason: string;
      adminNotes?: string;
    }) => {
      const res = await api.post<DocumentRequest>(DOCUMENT_REQUESTS.REJECT(id), {
        rejection_reason: rejectionReason,
        admin_notes: adminNotes,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-requests'] });
      queryClient.invalidateQueries({ queryKey: ['document-requests-summary'] });
    },
  });
}

export function useDeleteDocumentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(DOCUMENT_REQUESTS.DELETE(id));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-requests'] });
      queryClient.invalidateQueries({ queryKey: ['document-requests-summary'] });
    },
  });
}
