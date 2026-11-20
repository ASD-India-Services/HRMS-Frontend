import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

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
  const tenantParam = urlParams?.get('tenant') || '';

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
    queryKey: ['public-careers-embed-jobs', tenantParam],
    queryFn: async () => {
      const url = tenantParam
        ? `/api/v1/recruitment/public/jobs/?tenant=${encodeURIComponent(tenantParam)}`
        : '/api/v1/recruitment/public/jobs/';
      const headers = tenantParam ? { 'X-Tenant-Id': tenantParam } : {};
      const res = await api.get(url, { headers });
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
      const url = tenantParam
        ? `/api/v1/recruitment/public/apply/?tenant=${encodeURIComponent(tenantParam)}`
        : '/api/v1/recruitment/public/apply/';
      const headers = tenantParam ? { 'X-Tenant-Id': tenantParam } : {};
      const res = await api.post(url, {
        job_opening: selectedJob.id,
        ...payload,
      }, { headers });
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
    <div className={`${isIframe ? 'min-h-0 bg-transparent p-2 sm:p-4' : 'min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8'} font-sans text-slate-800 antialiased`}>
      <div className="mx-auto max-w-5xl">
        {/* Header Banner (hidden if parent site requests hide_header=true) */}
        {!hideHeader && (
          <header className="mb-8 text-center sm:text-left sm:flex sm:items-end sm:justify-between border-b border-slate-200 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 mb-2 border border-primary-100">
                <span className="h-2 w-2 rounded-full bg-primary-600 animate-pulse"></span>
                We're Hiring!
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Careers at {companyName}
              </h1>
              <p className="mt-1 text-sm text-slate-600 max-w-xl">
                Explore open positions, learn about our culture, and join us in building transformative solutions.
              </p>
            </div>
            <div className="mt-4 sm:mt-0 text-center sm:text-right">
              <span className="inline-block text-2xl font-bold text-slate-900">{jobs.length}</span>
              <span className="block text-xs uppercase tracking-wider text-slate-500 font-medium">Open Positions</span>
            </div>
          </header>
        )}

        {/* Filter & Search Bar */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by job title or keyword..."
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 shadow-sm transition-all"
            />
          </div>

          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              aria-label="Filter by department"
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3.5 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 shadow-sm transition-all"
            >
              <option value="all">All Departments ({jobs.length})</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Section */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-28 rounded-xl bg-white p-5 shadow-sm border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-800">Unable to load job postings right now.</p>
            <button
              onClick={() => refetch()}
              className="mt-3 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="mt-3 text-base font-semibold text-slate-800">No Open Roles Found</h3>
            <p className="mt-1 text-xs text-slate-500">
              {search || selectedDept !== 'all'
                ? 'Try clearing your search query or department filters.'
                : 'There are currently no open positions. Please check back later!'}
            </p>
            {(search || selectedDept !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedDept('all');
                }}
                className="mt-4 text-xs font-medium text-primary-600 hover:text-primary-700 underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-primary-300 transition-all sm:flex sm:items-center sm:justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {job.department_name && (
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                        {job.department_name}
                      </span>
                    )}
                    {job.vacancies > 0 && (
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-100">
                        {job.vacancies} {job.vacancies === 1 ? 'Opening' : 'Openings'}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-primary-600 transition-colors">
                    {job.title}
                  </h3>

                  {job.description && (
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 line-clamp-2 max-w-2xl">
                      {job.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 sm:mt-0 flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenJob(job)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
                  >
                    <span>View & Apply</span>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer info (hidden when embedded in parent website) */}
        {!isIframe && !hideHeader && (
          <footer className="mt-12 text-center text-xs text-slate-400 border-t border-slate-200 pt-6">
            <p>© {new Date().getFullYear()} {companyName}. All rights reserved.</p>
          </footer>
        )}
      </div>

      {/* Job Details & Apply Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                <span className="text-xs font-semibold text-primary-600 uppercase tracking-wider">
                  {selectedJob.department_name || 'Open Position'}
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">{selectedJob.title}</h2>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
              {/* Job Description */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">About This Role</h3>
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700 leading-relaxed border border-slate-100 whitespace-pre-wrap">
                  {selectedJob.description || 'No detailed description provided for this opening.'}
                </div>
              </div>

              {/* Application Form */}
              <div className="border-t border-slate-200 pt-5">
                <h3 className="text-sm font-bold text-slate-900 mb-3">
                  Apply for this Position
                </h3>

                {formSubmitted ? (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h4 className="text-base font-bold text-emerald-900">Application Submitted!</h4>
                    <p className="text-xs text-emerald-700 max-w-md mx-auto">
                      Thank you, <strong className="font-semibold">{form.name}</strong>! Your application has been directly sent to our hiring team. We will review your profile and reach out via email.
                    </p>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="mt-2 inline-flex items-center rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {formError && (
                      <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                        {formError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          placeholder="e.g. Jane Doe"
                          className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="jane@example.com"
                          className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          placeholder="+91 9876543210"
                          className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Resume / Portfolio Link <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="url"
                          required
                          value={form.resume_url}
                          onChange={(e) => setForm({ ...form, resume_url: e.target.value })}
                          placeholder="Google Drive, Dropbox, LinkedIn, or PDF URL"
                          className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Cover Note / Message <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <textarea
                        rows={3}
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        placeholder="Briefly tell us why you are a great fit for this position..."
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={applyMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50 transition-colors"
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
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
