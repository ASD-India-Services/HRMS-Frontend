import { useState } from 'react';
import api from '@/lib/api';

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
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Attendance Upload</h1><p className="mt-1 text-sm text-gray-600">Upload CSV file to bulk import attendance records</p></div>
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-4">
          <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block text-sm text-gray-500 file:mr-4 file:rounded file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-700 hover:file:bg-primary-100" />
          <button onClick={handleUpload} disabled={!file || uploading} className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50">{uploading ? 'Uploading...' : 'Upload'}</button>
        </div>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {result && <pre className="mt-4 rounded bg-gray-50 p-4 text-xs text-gray-700 overflow-auto">{JSON.stringify(result, null, 2)}</pre>}
      </div>
    </div>
  );
}
