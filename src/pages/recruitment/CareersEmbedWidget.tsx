import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Button, IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

interface JobOpening {
  id: string;
  title: string;
  department?: string;
  department_name?: string;
  designation?: string;
  designation_name?: string;
  description?: string;
  vacancies: number;
  status: string;
  posted_on?: string;
  closes_on?: string;
}

interface PublicJobsResponse {
  company_name: string;
  company_website: string;
  total_openings: number;
  results: JobOpening[];
}

export default function CareersEmbedWidget() {
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);

  // Application form state
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    resume_url: '',
    notes: '',
  });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  // Detect if widget is embedded in an iframe on an existing website
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const hideHeader = urlParams?.get('hide_header') === 'true';

  // Notify parent window of height changes for iframe auto-resizing
  useEffect(() => {
    const notifyHeight = () => {
      const height = document.documentElement.scrollHeight || document.body.scrollHeight;
      try {
        window.parent.postMessage({ type: 'HRMS_CAREERS_RESIZE', height }, '*');
      } catch {
        // Ignore cross-origin frame errors
      }
    };

    notifyHeight();
    const observer = new ResizeObserver(notifyHeight);
    observer.observe(document.body);
    window.addEventListener('resize', notifyHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', notifyHeight);
    };
  }, [selectedJob, formSubmitted]);

  // Fetch live public jobs without auth
  const { data, isLoading, isError, refetch } = useQuery<PublicJobsResponse>({
    queryKey: ['public-careers-embed-jobs'],
    queryFn: async () => {
      const res = await api.get('/api/v1/recruitment/public/jobs/');
      return res.data;
    },
    staleTime: 60 * 1000,
  });

  const jobs = data?.results || [];
  const companyName = data?.company_name || 'Our Company';

  // Extract unique departments for filtering
  const departments = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => {
      if (j.department_name) set.add(j.department_name);
    });
    return Array.from(set).sort();
  }, [jobs]);

  // Filtered jobs list
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch =
        !search.trim() ||
        job.title.toLowerCase().includes(search.toLowerCase()) ||
        (job.department_name && job.department_name.toLowerCase().includes(search.toLowerCase())) ||
        (job.description && job.description.toLowerCase().includes(search.toLowerCase()));

      const matchesDept = selectedDept === 'all' || job.department_name === selectedDept;

      return matchesSearch && matchesDept;
    });
  }, [jobs, search, selectedDept]);

  // Submit application mutation
  const applyMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      if (!selectedJob) throw new Error('No job selected');
      const res = await api.post('/api/v1/recruitment/public/apply/', {
        job_opening: selectedJob.id,
        ...payload,
      });
      return res.data;
    },
    onSuccess: () => {
      setFormSubmitted(true);
      setFormError('');
    },
    onError: (err: any) => {
      const data = err.response?.data;
      if (typeof data === 'object' && data !== null) {
        const firstError = Object.values(data)[0];
        setFormError(Array.isArray(firstError) ? firstError[0] : String(firstError || 'Failed to submit application.'));
      } else {
        setFormError('Failed to submit your application. Please check your details and try again.');
      }
    },
  });

  const handleOpenJob = (job: JobOpening) => {
    setSelectedJob(job);
    setFormSubmitted(false);
    setFormError('');
    setForm({
      name: '',
      email: '',
      phone: '',
      resume_url: '',
      notes: '',
    });
  };

  const handleCloseModal = () => {
    setSelectedJob(null);
    setFormSubmitted(false);
    setFormError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.resume_url.trim()) {
      setFormError('Please fill in all required fields (Name, Email, Phone, Resume URL).');
      return;
    }
    applyMutation.mutate(form);
  };

  return (
    <div className={`${isIframe ? 'min-h-0 bg-transparent p-2 sm:p-4' : 'min-h-screen bg-surface-neutral p-4 sm:p-6 lg:p-8'} font-sans text-ink-primary antialiased`}>
      <div className="mx-auto max-w-5xl">
        {/* Header Banner (hidden if parent site requests hide_header=true) */}
        {!hideHeader && (
          <header className="mb-8 text-center sm:text-left sm:flex sm:items-end sm:justify-between border-b border-divider pb-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-lighter px-3 py-1 text-xs font-semibold text-primary-dark mb-2 border border-primary-lighter">
                <span className="h-2 w-2 rounded-full bg-primary-main animate-pulse"></span>
                We're Hiring!
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-primary">
                Careers at {companyName}
              </h1>
              <p className="mt-1 text-sm text-ink-secondary max-w-xl">
                Explore open positions, learn about our culture, and join us in building transformative solutions.
              </p>
            </div>
            <div className="mt-4 sm:mt-0 text-center sm:text-right">
              <span className="inline-block text-2xl font-bold text-ink-primary">{jobs.length}</span>
              <span className="block text-xs uppercase tracking-wider text-ink-secondary font-medium">Open Positions</span>
            </div>
          </header>
        )}

        {/* Filter & Search Bar */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-disabled"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by job title or keyword..."
              className="pl-10 pr-4"
            />
          </div>

          <div>
            <Select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              aria-label="Filter by department"
            >
              <option value="all">All Departments ({jobs.length})</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Content Section */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-28 rounded-xl bg-surface-paper p-5 shadow-sm border border-divider animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-error-light bg-error-lighter p-6 text-center">
            <p className="text-sm font-medium text-error-dark">Unable to load job postings right now.</p>
            <Button type="button" color="error" size="small"
              onClick={() => refetch()}
              className="mt-3"
            >
              Retry
            </Button>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-divider bg-surface-paper p-12 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-neutral text-ink-disabled">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="mt-3 text-base font-semibold text-ink-primary">No Open Roles Found</h3>
            <p className="mt-1 text-xs text-ink-secondary">
              {search || selectedDept !== 'all'
                ? 'Try clearing your search query or department filters.'
                : 'There are currently no open positions. Please check back later!'}
            </p>
            {(search || selectedDept !== 'all') && (
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  setSearch('');
                  setSelectedDept('all');
                }}
                className="mt-4"
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="group relative rounded-2xl border border-divider bg-surface-paper p-5 shadow-sm hover:shadow-md hover:border-primary-light transition-all sm:flex sm:items-center sm:justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {job.department_name && (
                      <span className="inline-flex items-center rounded-md bg-surface-neutral px-2.5 py-0.5 text-xs font-medium text-ink-primary">
                        {job.department_name}
                      </span>
                    )}
                    {job.vacancies > 0 && (
                      <span className="inline-flex items-center rounded-md bg-primary-lighter px-2 py-0.5 text-xs font-medium text-primary-dark border border-primary-lighter">
                        {job.vacancies} {job.vacancies === 1 ? 'Opening' : 'Openings'}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-ink-primary group-hover:text-primary-main transition-colors">
                    {job.title}
                  </h3>

                  {job.description && (
                    <p className="mt-1 text-xs sm:text-sm text-ink-secondary line-clamp-2 max-w-2xl">
                      {job.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 sm:mt-0 flex shrink-0 items-center gap-2">
                  <Button size="small"
                    type="button"
                    onClick={() => handleOpenJob(job)}
                  >
                    <span>View & Apply</span>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer info */}
        <footer className="mt-12 text-center text-xs text-ink-disabled border-t border-divider pt-6">
          <p>© {new Date().getFullYear()} {companyName}. All rights reserved.</p>
        </footer>
      </div>

      {/* Job Details & Apply Modal */}
      {selectedJob && (
        <Modal open onClose={handleCloseModal} labelledBy="CareersEmbedWidget-modal-title-1" size="lg" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-divider bg-surface-neutral px-6 py-4">
              <div>
                <span className="text-xs font-semibold text-primary-main uppercase tracking-wider">
                  {selectedJob.department_name || 'Open Position'}
                </span>
                <h2 id="CareersEmbedWidget-modal-title-1" className="text-lg sm:text-xl font-bold text-ink-primary mt-0.5">{selectedJob.title}</h2>
              </div>
              <IconButton icon="close" size="small" aria-label="Close" onClick={handleCloseModal} />
            </div>

            {/* Modal Body */}
            <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
              {/* Job Description */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-secondary mb-2">About This Role</h3>
                <div className="rounded-xl bg-surface-neutral p-4 text-sm text-ink-primary leading-relaxed border border-divider whitespace-pre-wrap">
                  {selectedJob.description || 'No detailed description provided for this opening.'}
                </div>
              </div>

              {/* Application Form */}
              <div className="border-t border-divider pt-5">
                <h3 className="text-sm font-bold text-ink-primary mb-3">
                  Apply for this Position
                </h3>

                {formSubmitted ? (
                  <div className="rounded-xl bg-success-lighter border border-success-light p-6 text-center space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-lighter text-success-main">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h4 className="text-base font-bold text-success-darker">Application Submitted!</h4>
                    <p className="text-xs text-success-dark max-w-md mx-auto">
                      Thank you, <strong className="font-semibold">{form.name}</strong>! Your application has been directly sent to our hiring team. We will review your profile and reach out via email.
                    </p>
                    <Button color="success" onClick={handleCloseModal} className="mt-2">
                      Done
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {formError && (
                      <div className="rounded-lg bg-error-lighter p-3 text-xs text-error-dark border border-error-light">
                        {formError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1">
                          Full Name <span className="text-error-main">*</span>
                        </label>
                        <Input
                          type="text"
                          required
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          placeholder="e.g. Jane Doe"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1">
                          Email Address <span className="text-error-main">*</span>
                        </label>
                        <Input
                          type="email"
                          required
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="jane@example.com"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1">
                          Phone Number <span className="text-error-main">*</span>
                        </label>
                        <Input
                          type="tel"
                          required
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          placeholder="+91 9876543210"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-ink-primary mb-1">
                          Resume / Portfolio Link <span className="text-error-main">*</span>
                        </label>
                        <Input
                          type="url"
                          required
                          value={form.resume_url}
                          onChange={(e) => setForm({ ...form, resume_url: e.target.value })}
                          placeholder="Google Drive, Dropbox, LinkedIn, or PDF URL"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink-primary mb-1">
                        Cover Note / Message <span className="text-ink-disabled font-normal">(Optional)</span>
                      </label>
                      <Textarea
                        rows={3}
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        placeholder="Briefly tell us why you are a great fit for this position..."
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <Button variant="outlined" color="inherit" size="small"
                        type="button"
                        onClick={handleCloseModal}
                      >
                        Cancel
                      </Button>
                      <Button size="small"
                        type="submit"
                        disabled={applyMutation.isPending}
                      >
                        {applyMutation.isPending ? (
                          <>
                            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                            </svg>
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <span>Submit Application</span>
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
