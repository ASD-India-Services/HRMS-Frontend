import { useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';

const ENDPOINT = '/api/v1/attendance/upload/';

export default function AttendanceUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post(ENDPOINT, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(res.data as Record<string, unknown>);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader title="Attendance Upload" subtitle="Upload CSV file to bulk import attendance records" />
      <Card><CardContent>
        <div className="flex items-center gap-4">
          <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block text-sm text-ink-secondary file:mr-4 file:rounded file:border-0 file:bg-primary-lighter file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-dark hover:file:bg-primary-lighter" />
          <Button type="button" onClick={handleUpload} disabled={!file || uploading}>{uploading ? 'Uploading...' : 'Upload'}</Button>
        </div>
        {error && <p className="mt-4 text-sm text-error-main">{error}</p>}
        {result && <pre className="mt-4 rounded bg-surface-neutral p-4 text-xs text-ink-primary overflow-auto">{JSON.stringify(result, null, 2)}</pre>}
      </CardContent></Card>
    </PageContainer>
  );
}
