import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Iconify } from '@/components/Iconify';

interface JobDetails {
  id: string;
  title: string;
  department_name?: string;
  designation_name?: string;
  description?: string;
  vacancies?: number;
  posted_on?: string;
  closes_on?: string;
  company_website?: string;
}

export default function PublicJobApplyPage() {
  const { jobId } = useParams<{ jobId: string }>();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    resume_url: '',
    notes: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch job details without authentication
  const { data: job, isLoading, isError } = useQuery<JobDetails>({
    queryKey: ['public-job-detail', jobId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/recruitment/public/jobs/${jobId}/`);
      return res.data;
    },
    enabled: !!jobId,
  });

  const applyMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await api.post('/api/v1/recruitment/public/apply/', {
        job_opening: jobId,
        ...payload,
      });
      return res.data;
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err: any) => {
      const data = err.response?.data;
      if (typeof data === 'object' && data !== null) {
        const firstError = Object.values(data)[0];
        setErrorMessage(Array.isArray(firstError) ? firstError[0] : String(firstError || 'Failed to submit application.'));
      } else {
        setErrorMessage('Failed to submit application. Please try again.');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!form.name || !form.email) {
      setErrorMessage('Please fill in your name and email address.');
      return;
    }
    applyMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-neutral">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-main border-t-transparent"></div>
          <p className="text-sm text-ink-secondary">Loading job opening...</p>
        </div>
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-neutral p-4">
        <div className="w-full max-w-md rounded-2xl bg-surface-paper p-8 text-center shadow-lg">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error-lighter text-error-main">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-bold text-ink-primary">Job Opening Unavailable</h2>
          <p className="mt-2 text-sm text-ink-secondary">
            This job opening is either closed or no longer accepting public applications.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-neutral p-4">
        <div className="w-full max-w-lg rounded-2xl bg-surface-paper p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-lighter text-success-main">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-ink-primary">Application Submitted!</h2>
          <p className="mt-2 text-sm text-ink-secondary">
            Thank you, <span className="font-semibold text-ink-primary">{form.name}</span>. Your application for{' '}
            <span className="font-semibold text-primary-main">{job.title}</span> has been received and routed directly to our hiring team.
          </p>
          <div className="mt-6 border-t border-divider pt-6">
            {job.company_website && (
              <ButtonLink
                href={job.company_website.startsWith('http') ? job.company_website : `https://${job.company_website}`}
                endIcon={<Iconify icon="arrow-right" />}
              >
                Back to Company Website
              </ButtonLink>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-grey-50 to-secondary-lighter/40 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header Branding */}
        <div className="mb-6 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-lighter px-3 py-1 text-xs font-semibold text-primary-dark">
            <span className="h-2 w-2 rounded-full bg-success-main"></span>
            Accepting Applications
          </span>
          {job.company_website && (
            <a
              href={job.company_website.startsWith('http') ? job.company_website : `https://${job.company_website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-ink-secondary hover:text-primary-main transition-colors"
            >
              Company Website
            </a>
          )}
        </div>

        {/* Job Overview Card */}
        <div className="overflow-hidden rounded-2xl border border-divider bg-surface-paper p-6 shadow-sm sm:p-8">
          <div className="border-b border-divider pb-6">
            <h1 className="text-3xl font-extrabold text-ink-primary">{job.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-ink-secondary">
              {job.department_name && (
                <div className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-ink-disabled" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>{job.department_name}</span>
                </div>
              )}
              {job.designation_name && (
                <div className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-ink-disabled" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>{job.designation_name}</span>
                </div>
              )}
              {job.vacancies && (
                <div className="flex items-center gap-1.5 text-success-main font-medium">
                  <span>{job.vacancies} open position{job.vacancies > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>

            {job.description && (
              <div className="mt-5 text-sm leading-relaxed text-ink-primary whitespace-pre-line bg-surface-neutral/70 p-4 rounded-xl border border-divider">
                {job.description}
              </div>
            )}
          </div>

          {/* Application Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <h2 className="text-lg font-bold text-ink-primary">Apply for this Role</h2>

            {errorMessage && (
              <div className="rounded-lg bg-error-lighter p-4 text-sm text-error-dark border border-error-light">
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider">
                  Full Name <span className="text-error-main">*</span>
                </label>
                <Input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Rahul Sharma"
                  className="mt-1.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider">
                  Email Address <span className="text-error-main">*</span>
                </label>
                <Input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="e.g. rahul@example.com"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="e.g. +91 98765 43210"
                  className="mt-1.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider">
                  Resume / Portfolio Link (URL)
                </label>
                <Input
                  type="url"
                  value={form.resume_url}
                  onChange={(e) => setForm((p) => ({ ...p, resume_url: e.target.value }))}
                  placeholder="https://linkedin.com/in/... or Google Drive PDF link"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider">
                Notes / Cover Letter
              </label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Briefly introduce yourself and your relevant experience..."
                className="mt-1.5"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={applyMutation.isPending}
                className="w-full"
              >
                {applyMutation.isPending ? 'Submitting Application...' : 'Submit Application'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
