/**
 * RecruitmentStages — Configuration page for hiring pipeline stages per Job Opening.
 *
 * Requirements & Features:
 * - View a list/grid of all Job Openings with department, status, vacancies, candidate count, and stage configuration status
 * - Click on any Job Opening to configure stages specifically for that job opening
 * - Quick access to Organization Default Pipeline Template
 * - Initialize / Copy default stages to a job opening with 1-click
 * - Add, edit, delete, and reorder stages for the selected job opening
 * - Visual pipeline stepper preview and live candidate counts
 * - URL search param support (?job=<id>) for direct linking and navigation
 */

import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  useRecruitmentStages,
  useCreateRecruitmentStage,
  useUpdateRecruitmentStage,
  useDeleteRecruitmentStage,
  useReorderRecruitmentStages,
  useInitializeJobStages,
  useJobOpenings,
  useApplicants,
} from '@/hooks/useRecruitment';
import type { RecruitmentStage, JobOpeningStatus } from '@/types/recruitment';

export const STAGE_COLOR_PRESETS: {
  key: string;
  label: string;
  bg: string;
  dot: string;
  badge: string;
  border: string;
  previewClass: string;
}[] = [
  { key: 'blue', label: 'Blue', bg: 'bg-blue-500', dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200', border: 'border-blue-400', previewClass: 'from-blue-500 to-indigo-600' },
  { key: 'amber', label: 'Amber / Gold', bg: 'bg-amber-500', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200', border: 'border-amber-400', previewClass: 'from-amber-500 to-orange-500' },
  { key: 'purple', label: 'Purple / Violet', bg: 'bg-purple-500', dot: 'bg-purple-500', badge: 'bg-purple-50 text-purple-700 border-purple-200', border: 'border-purple-400', previewClass: 'from-purple-500 to-indigo-600' },
  { key: 'emerald', label: 'Emerald / Green', bg: 'bg-emerald-500', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', border: 'border-emerald-400', previewClass: 'from-emerald-500 to-teal-600' },
  { key: 'teal', label: 'Teal / Cyan', bg: 'bg-teal-500', dot: 'bg-teal-500', badge: 'bg-teal-50 text-teal-700 border-teal-200', border: 'border-teal-400', previewClass: 'from-teal-500 to-emerald-600' },
  { key: 'rose', label: 'Rose / Red', bg: 'bg-rose-500', dot: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-200', border: 'border-rose-400', previewClass: 'from-rose-500 to-red-600' },
  { key: 'indigo', label: 'Indigo', bg: 'bg-indigo-500', dot: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', border: 'border-indigo-400', previewClass: 'from-indigo-500 to-purple-600' },
  { key: 'cyan', label: 'Sky Cyan', bg: 'bg-cyan-500', dot: 'bg-cyan-500', badge: 'bg-cyan-50 text-cyan-700 border-cyan-200', border: 'border-cyan-400', previewClass: 'from-cyan-500 to-blue-500' },
  { key: 'pink', label: 'Pink', bg: 'bg-pink-500', dot: 'bg-pink-500', badge: 'bg-pink-50 text-pink-700 border-pink-200', border: 'border-pink-400', previewClass: 'from-pink-500 to-rose-500' },
  { key: 'slate', label: 'Slate Gray', bg: 'bg-slate-500', dot: 'bg-slate-500', badge: 'bg-slate-50 text-slate-700 border-slate-200', border: 'border-slate-400', previewClass: 'from-slate-600 to-gray-700' },
];

export function getStagePreset(colorKey: string) {
  const normalized = (colorKey || 'blue').toLowerCase();
  return (
    STAGE_COLOR_PRESETS.find((p) => p.key === normalized) ||
    STAGE_COLOR_PRESETS[0]
  );
}

const STATUS_BADGES: Record<JobOpeningStatus, { label: string; badge: string; dot: string }> = {
  open: { label: 'Open', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  closed: { label: 'Closed', badge: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' },
  on_hold: { label: 'On Hold', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  cancelled: { label: 'Cancelled', badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
};

export function RecruitmentStages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedJobId = searchParams.get('job'); // null, 'default', or <uuid>

  // Fetch job openings list for the openings directory view
  const { data: openingsData, isLoading: isLoadingOpenings } = useJobOpenings({ page_size: 100 });
  const jobOpenings = useMemo(() => openingsData?.results || [], [openingsData]);

  // Determine current active opening
  const isDefaultPipeline = selectedJobId === 'default';
  const selectedOpening = useMemo(() => {
    if (!selectedJobId || isDefaultPipeline) return null;
    return jobOpenings.find((j) => j.id === selectedJobId) || null;
  }, [selectedJobId, isDefaultPipeline, jobOpenings]);

  // Fetch organization default stages count for directory badges
  const { data: defaultStages = [] } = useRecruitmentStages({ job_opening: 'default' });

  // When a job opening is selected, fetch stages scoped to that job opening
  const {
    data: activeStagesRaw = [],
    isLoading: isLoadingStages,
    isError: isStageError,
    error: stageError,
  } = useRecruitmentStages(
    selectedJobId ? { job_opening: selectedJobId } : undefined
  );

  // Filter job openings directory state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filtered job openings
  const filteredOpenings = useMemo(() => {
    return jobOpenings.filter((job) => {
      const matchSearch =
        !searchTerm.trim() ||
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (job.department_name && job.department_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (job.designation_name && job.designation_name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === 'all' || job.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [jobOpenings, searchTerm, statusFilter]);

  // Fetch applicants for the selected job opening to compute live counts
  const { data: applicantsData } = useApplicants({
    job_opening: selectedOpening?.id,
    page_size: 500,
  });

  const createMutation = useCreateRecruitmentStage();
  const updateMutation = useUpdateRecruitmentStage();
  const deleteMutation = useDeleteRecruitmentStage();
  const reorderMutation = useReorderRecruitmentStages();
  const initializeMutation = useInitializeJobStages();

  // Real-time live applicant count map derived immediately from cached applicants
  const applicantCountMap = useMemo(() => {
    if (!applicantsData?.results) return null;
    const map: Record<string, number> = {};
    for (const app of applicantsData.results) {
      if (app.stage) {
        map[app.stage] = (map[app.stage] || 0) + 1;
      }
      if (app.status) {
        const sKey = app.status.toLowerCase();
        map[sKey] = (map[sKey] || 0) + 1;
      }
    }
    return map;
  }, [applicantsData]);

  // Instant live count helper
  const getStageApplicantCount = (stage: RecruitmentStage | null) => {
    if (!stage) return 0;
    if (applicantCountMap) {
      if (applicantCountMap[stage.id] !== undefined) return applicantCountMap[stage.id];
      if (applicantCountMap[stage.slug.toLowerCase()] !== undefined) return applicantCountMap[stage.slug.toLowerCase()];
      if (applicantCountMap[stage.name.toLowerCase()] !== undefined) return applicantCountMap[stage.name.toLowerCase()];
    }
    return stage.applicant_count ?? 0;
  };

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<RecruitmentStage | null>(null);
  const [deleteStageTarget, setDeleteStageTarget] = useState<RecruitmentStage | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formColor, setFormColor] = useState('blue');
  const [formOrder, setFormOrder] = useState<number>(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Sorted active stages
  const sortedStages = useMemo(() => {
    return [...activeStagesRaw].sort((a, b) => a.order - b.order);
  }, [activeStagesRaw]);

  // Email format modal state
  const [emailModalStage, setEmailModalStage] = useState<RecruitmentStage | null>(null);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailActiveTab, setEmailActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [emailModalError, setEmailModalError] = useState<string | null>(null);

  const getDefaultEmailBodyForStage = (stageName: string): string => {
    const nameLower = (stageName || '').toLowerCase();
    if (nameLower.includes('interview')) {
      return `Dear {{candidate_name}},\n\nThank you for applying for the {{job_title}} position at {{company_name}}.\n\nWe are pleased to invite you for an interview. Our talent acquisition team will be in touch with schedule and platform details shortly.\n\nBest regards,\n{{company_name}} Recruitment Team`;
    }
    if (nameLower.includes('reject')) {
      return `Dear {{candidate_name}},\n\nThank you for taking the time to apply for the {{job_title}} role at {{company_name}}.\n\nAfter careful consideration, we have decided to move forward with other candidates whose profiles more closely align with our current requirements.\n\nWe appreciate your interest in our company and wish you success in your future endeavors.\n\nWarm regards,\n{{company_name}} Talent Acquisition`;
    }
    if (nameLower.includes('select') || nameLower.includes('offer')) {
      return `Dear {{candidate_name}},\n\nCongratulations! We are delighted to inform you that you have been selected for the {{job_title}} role at {{company_name}}.\n\nOur team is currently preparing your formal offer letter and onboarding packet.\n\nBest regards,\n{{company_name}} HR Team`;
    }
    if (nameLower.includes('screen')) {
      return `Dear {{candidate_name}},\n\nThank you for applying for {{job_title}} at {{company_name}}.\n\nYour application has successfully passed our initial review and has moved to the screening stage. We will review your qualifications and contact you with next steps.\n\nBest regards,\n{{company_name}} Recruitment Team`;
    }
    return `Dear {{candidate_name}},\n\nWe are writing to update you that your application for {{job_title}} has been moved to the {{stage_name}} stage.\n\nWe will be in touch with further updates soon.\n\nBest regards,\n{{company_name}} Team`;
  };

  const openEmailModal = (stage: RecruitmentStage) => {
    setEmailModalStage(stage);
    setEmailEnabled(stage.email_enabled ?? true);
    setEmailSubject(stage.email_subject || `Update regarding your application for {{job_title}}`);
    setEmailBody(stage.email_body || getDefaultEmailBodyForStage(stage.name));
    setEmailActiveTab('editor');
    setEmailModalError(null);
  };

  const handleSaveEmailTemplate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!emailModalStage) return;

    if (emailEnabled && !emailSubject.trim()) {
      setEmailModalError('Please enter an email subject line.');
      return;
    }
    if (emailEnabled && !emailBody.trim()) {
      setEmailModalError('Please enter the email body message.');
      return;
    }

    setIsSavingEmail(true);
    setEmailModalError(null);
    try {
      await updateMutation.mutateAsync({
        id: emailModalStage.id,
        data: {
          email_enabled: emailEnabled,
          email_subject: emailSubject.trim(),
          email_body: emailBody.trim(),
        },
      });
      setSuccessBanner(
        emailEnabled
          ? `Automated candidate email enabled for "${emailModalStage.name}".`
          : `Automated email disabled for "${emailModalStage.name}".`
      );
      setEmailModalStage(null);
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      setEmailModalError(err?.response?.data?.error || 'Failed to save email settings.');
    } finally {
      setIsSavingEmail(false);
    }
  };

  const openCreateModal = () => {
    setEditingStage(null);
    setFormName('');
    setFormSlug('');
    setFormColor('indigo');
    const nextOrder = sortedStages.length > 0 ? Math.max(...sortedStages.map((s) => s.order)) + 1 : 1;
    setFormOrder(nextOrder);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (stage: RecruitmentStage) => {
    setEditingStage(stage);
    setFormName(stage.name);
    setFormSlug(stage.slug);
    setFormColor(stage.color || 'blue');
    setFormOrder(stage.order);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Stage name is required.');
      return;
    }

    setFormError(null);
    try {
      const targetJobOpening = isDefaultPipeline ? null : selectedJobId;
      if (editingStage) {
        await updateMutation.mutateAsync({
          id: editingStage.id,
          data: {
            name: formName.trim(),
            slug: formSlug.trim() || undefined,
            color: formColor,
            order: Number(formOrder) || 1,
          },
        });
        setSuccessBanner(`Stage "${formName}" updated successfully.`);
      } else {
        await createMutation.mutateAsync({
          name: formName.trim(),
          slug: formSlug.trim() || undefined,
          color: formColor,
          order: Number(formOrder) || sortedStages.length + 1,
          job_opening: targetJobOpening,
        });
        setSuccessBanner(`Stage "${formName}" created successfully.`);
      }
      setIsModalOpen(false);
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      const resp = err?.response?.data;
      const msg =
        resp?.error ||
        resp?.detail ||
        (resp?.name && resp.name[0]) ||
        'Failed to save stage. Please try again.';
      setFormError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedStages.length) return;

    const reordered = [...sortedStages];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const payload = reordered.map((stage, i) => ({
      id: stage.id,
      order: i + 1,
    }));

    try {
      await reorderMutation.mutateAsync({
        stages: payload,
        job_opening: isDefaultPipeline ? undefined : selectedJobId || undefined,
      });
    } catch (err) {
      console.error('Failed to reorder stages:', err);
    }
  };

  const handleDelete = async (stage: RecruitmentStage) => {
    try {
      await deleteMutation.mutateAsync(stage.id);
      setDeleteStageTarget(null);
      setSuccessBanner(`Stage "${stage.name}" has been deleted.`);
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      const resp = err?.response?.data;
      const msg = resp?.error || resp?.detail || 'Failed to delete stage.';
      alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  const handleInitializeDefaults = async () => {
    if (!selectedOpening) return;
    try {
      await initializeMutation.mutateAsync(selectedOpening.id);
      setSuccessBanner(`Successfully copied organization default stages to "${selectedOpening.title}".`);
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      const resp = err?.response?.data;
      const msg = resp?.error || resp?.detail || 'Failed to initialize default stages.';
      alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  const selectedPreset = getStagePreset(formColor);

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 1: JOB OPENINGS LIST (when no job is selected)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!selectedJobId) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Top Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                </svg>
              </span>
              <h1 className="text-2xl font-bold text-gray-900">Recruitment Stages</h1>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Configure custom hiring pipeline stages for each job opening, or manage organization defaults.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/recruitment/pipeline"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z" />
              </svg>
              View Pipeline Board
            </Link>
          </div>
        </div>

        {/* Global Default Stages Highlight Card */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.27.1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.27-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900">Organization Default Stages</h3>
                  <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                    {defaultStages.length} Stages Configured
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-600 max-w-2xl">
                  Standard baseline pipeline inherited by any job opening without customized stages. Edit the default template or configure job-specific stages below.
                </p>
              </div>
            </div>

            <button
              onClick={() => setSearchParams({ job: 'default' })}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-xs font-semibold text-indigo-700 shadow-xs transition hover:bg-indigo-50 hover:border-indigo-300"
            >
              Configure Default Template
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              placeholder="Search by job title or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 shadow-2xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Status:</span>
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-2xs">
              {['all', 'open', 'closed', 'on_hold'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition ${
                    statusFilter === st
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {st === 'all' ? 'All Jobs' : st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoadingOpenings && (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-r-transparent"></div>
            <p className="mt-3 text-sm font-medium text-gray-500">Loading job openings...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoadingOpenings && filteredOpenings.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </div>
            <h3 className="mt-3 text-base font-semibold text-gray-900">No Job Openings Found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'No job openings match your search filter.' : 'Create your first job opening to configure stages.'}
            </p>
            <Link
              to="/recruitment"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
            >
              Go to Job Openings
            </Link>
          </div>
        )}

        {/* Job Openings Grid */}
        {!isLoadingOpenings && filteredOpenings.length > 0 && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredOpenings.map((job) => {
              const statusCfg = STATUS_BADGES[job.status] || STATUS_BADGES.open;
              const hasCustom = job.has_custom_stages;
              const stageCount = job.stage_count || defaultStages.length;

              return (
                <div
                  key={job.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-gray-200/90 bg-white p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
                >
                  <div>
                    {/* Header: Status & Vacancies */}
                    <div className="mb-3 flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${statusCfg.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                      <span className="text-xs font-medium text-gray-400">
                        {job.vacancies} {job.vacancies === 1 ? 'vacancy' : 'vacancies'}
                      </span>
                    </div>

                    {/* Job Title */}
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {job.title}
                    </h3>

                    {/* Department / Designation */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                      {job.department_name && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
                          <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.75c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.75h-4.5" />
                          </svg>
                          {job.department_name}
                        </span>
                      )}
                      {job.designation_name && (
                        <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-gray-600 border border-gray-100">
                          {job.designation_name}
                        </span>
                      )}
                    </div>

                    {/* Pipeline Stage Status Badge */}
                    <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600">Hiring Pipeline:</span>
                        {hasCustom ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                            </svg>
                            Custom ({stageCount} Stages)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                            <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>
                            Default ({stageCount} Stages)
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                        <span>{job.applicant_count || 0} active candidate(s)</span>
                        <span>{hasCustom ? 'Job-specific workflow' : 'Inherits default template'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Action */}
                  <div className="mt-5 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => setSearchParams({ job: job.id })}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-50 py-2.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-600 hover:text-white"
                    >
                      <span>Configure Stages</span>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 2: STAGE CONFIGURATION FOR SELECTED JOB OPENING (or Default Template)
  // ─────────────────────────────────────────────────────────────────────────────
  const pageTitle = isDefaultPipeline
    ? 'Organization Default Stages'
    : selectedOpening
    ? `Configure Stages: ${selectedOpening.title}`
    : 'Configure Job Stages';

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb / Back button */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setSearchParams({})}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-indigo-600 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to All Job Openings
        </button>

        {/* Quick job switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Switch Job:</span>
          <select
            value={isDefaultPipeline ? 'default' : selectedJobId || ''}
            onChange={(e) => setSearchParams(e.target.value ? { job: e.target.value } : {})}
            className="rounded-lg border border-gray-200 bg-white py-1 px-2.5 text-xs font-medium text-gray-700 shadow-2xs focus:border-indigo-500 focus:outline-none"
          >
            <option value="default">📋 Organization Defaults</option>
            {jobOpenings.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} {j.has_custom_stages ? '(Custom)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Banner & Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
              </svg>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
                {selectedOpening && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${
                      STATUS_BADGES[selectedOpening.status]?.badge || STATUS_BADGES.open.badge
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_BADGES[selectedOpening.status]?.dot || STATUS_BADGES.open.dot}`} />
                    {selectedOpening.status.toUpperCase()}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-600">
                {isDefaultPipeline
                  ? 'Manage the global default stages applied to all job openings that do not have custom stages.'
                  : selectedOpening
                  ? `Customized hiring pipeline specifically for "${selectedOpening.title}". Candidates for this job will progress through these stages.`
                  : 'Recruitment stage configuration.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/recruitment/pipeline"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
            View Pipeline Board
          </Link>

          {/* Copy defaults button if opening has no custom stages */}
          {selectedOpening && sortedStages.length === 0 && (
            <button
              onClick={handleInitializeDefaults}
              disabled={initializeMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3.5 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100 disabled:opacity-50"
            >
              <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
              </svg>
              {initializeMutation.isPending ? 'Copying...' : 'Copy Default Stages'}
            </button>
          )}

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Stage
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successBanner && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm transition-all animate-fadeIn">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-600 hover:text-emerald-800">
            ✕
          </button>
        </div>
      )}

      {/* Notice banner if this job opening has no custom stages configured yet */}
      {selectedOpening && sortedStages.length === 0 && !isLoadingStages && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
              </span>
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  Using Organization Default Pipeline ({defaultStages.length} Stages)
                </h4>
                <p className="mt-0.5 text-xs text-amber-700">
                  This job opening does not have a custom stage flow yet. It currently uses the standard default stages.
                  You can copy the default stages to customize them for this position, or add custom stages directly.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleInitializeDefaults}
                disabled={initializeMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50"
              >
                ⚡ Copy Organization Defaults
              </button>
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-semibold text-amber-900 shadow-xs hover:bg-amber-50"
              >
                + Add Stage From Scratch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Visual Stepper Preview */}
      {sortedStages.length > 0 && (
        <div className="mb-8 rounded-2xl border border-gray-200/80 bg-gradient-to-b from-white to-gray-50/50 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Hiring Pipeline Flow ({sortedStages.length} Stages)
            </h2>
            <span className="text-xs text-gray-400">Sequence from candidate application to completion</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {sortedStages.map((stage, idx) => {
              const preset = getStagePreset(stage.color);
              return (
                <div key={stage.id} className="flex items-center gap-2 shrink-0">
                  <div
                    className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition shadow-sm ${preset.badge}`}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-[10px] font-bold shadow-xs">
                      {idx + 1}
                    </span>
                    <span>{stage.name}</span>
                    <span className="ml-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                      {getStageApplicantCount(stage)}
                    </span>
                  </div>
                  {idx < sortedStages.length - 1 && (
                    <svg className="h-4 w-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading & Error States */}
      {isLoadingStages && (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-r-transparent"></div>
          <p className="mt-3 text-sm font-medium text-gray-500">Loading stages...</p>
        </div>
      )}

      {isStageError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800 shadow-sm">
          <p className="font-semibold">Unable to load recruitment stages</p>
          <p className="mt-1 text-sm text-rose-600">
            {(stageError as any)?.message || 'Please check your connection and try again.'}
          </p>
        </div>
      )}

      {/* Main Stages Cards / Table */}
      {!isLoadingStages && !isStageError && sortedStages.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50/75 px-6 py-3.5">
            <div className="grid grid-cols-12 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <div className="col-span-1">Order</div>
              <div className="col-span-3">Stage Name</div>
              <div className="col-span-2">Color Theme</div>
              <div className="col-span-1">Type</div>
              <div className="col-span-2 text-center">Auto Email</div>
              <div className="col-span-1 text-center">Candidates</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {sortedStages.map((stage, index) => {
              const preset = getStagePreset(stage.color);
              return (
                <div
                  key={stage.id}
                  className="grid grid-cols-12 items-center px-6 py-4 transition hover:bg-gray-50/80"
                >
                  {/* Order & Reorder Controls */}
                  <div className="col-span-1 flex items-center gap-1.5">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-700">
                      #{stage.order}
                    </span>
                    <div className="flex flex-col">
                      <button
                        onClick={() => handleMove(index, 'up')}
                        disabled={index === 0 || reorderMutation.isPending}
                        title="Move Up"
                        className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-20 disabled:hover:bg-transparent"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleMove(index, 'down')}
                        disabled={index === sortedStages.length - 1 || reorderMutation.isPending}
                        title="Move Down"
                        className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-20 disabled:hover:bg-transparent"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Stage Name & Slug */}
                  <div className="col-span-3 flex items-center gap-3">
                    <span className={`h-3 w-3 shrink-0 rounded-full ${preset.dot}`} />
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{stage.name}</h3>
                      <p className="font-mono text-xs text-gray-400">code: {stage.slug}</p>
                    </div>
                  </div>

                  {/* Color Theme Pill */}
                  <div className="col-span-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${preset.badge}`}>
                      <span className={`h-2 w-2 rounded-full ${preset.dot}`} />
                      {preset.label}
                    </span>
                  </div>

                  {/* System vs Custom Tag */}
                  <div className="col-span-1">
                    {stage.is_system ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700" title="System Default Stage">
                        System
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700" title="Custom Stage">
                        Custom
                      </span>
                    )}
                  </div>

                  {/* Auto Email Column */}
                  <div className="col-span-2 flex items-center justify-center">
                    {stage.email_enabled ? (
                      <button
                        type="button"
                        onClick={() => openEmailModal(stage)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition shadow-2xs group"
                        title="Automated email notification is enabled. Click to edit format."
                      >
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Enabled</span>
                        <svg className="h-3.5 w-3.5 text-emerald-600 opacity-70 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openEmailModal(stage)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition shadow-2xs"
                        title="Click to enable and configure candidate email format"
                      >
                        <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                        <span>Disabled</span>
                        <span className="text-[10px] text-blue-600 font-semibold underline ml-0.5">Enable</span>
                      </button>
                    )}
                  </div>

                  {/* Candidate Count */}
                  <div className="col-span-1 text-center">
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-100 px-2 text-xs font-semibold text-gray-700">
                      {getStageApplicantCount(stage)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditModal(stage)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition shadow-2xs"
                    >
                      <svg className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteStageTarget(stage)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition shadow-2xs"
                      title={`Delete stage ${stage.name}`}
                    >
                      <svg className="h-3.5 w-3.5 text-rose-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Configure Stage Email Format Modal */}
      {emailModalStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl transition-all">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Configure Stage Email Notification</h2>
                  <p className="text-xs text-gray-500">
                    Automated notification sent to candidates when moved to{' '}
                    <span className="font-semibold text-gray-800">{emailModalStage.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEmailModalStage(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >
                ✕
              </button>
            </div>

            {/* Error banner if any */}
            {emailModalError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {emailModalError}
              </div>
            )}

            <div className="mt-5 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Enable / Disable Toggle Switch */}
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/70 p-3.5">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Enable Auto Email for this Stage
                  </p>
                  <p className="text-xs text-gray-500">
                    Automatically deliver this email to candidate when moved into &ldquo;{emailModalStage.name}&rdquo;.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailEnabled(!emailEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                    emailEnabled ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                  role="switch"
                  aria-checked={emailEnabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      emailEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Supported Dynamic Placeholders */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1.5">
                  Available Merge Placeholders (click to insert):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { token: '{{candidate_name}}', desc: 'Full Name' },
                    { token: '{{candidate_first_name}}', desc: 'First Name' },
                    { token: '{{job_title}}', desc: 'Job Opening Title' },
                    { token: '{{stage_name}}', desc: 'Stage Name' },
                    { token: '{{company_name}}', desc: 'Company / Organization' },
                  ].map((item) => (
                    <button
                      key={item.token}
                      type="button"
                      onClick={() => {
                        setEmailBody((prev) => `${prev} ${item.token}`);
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 font-mono text-[11px] text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition"
                      title={`Insert ${item.desc}`}
                    >
                      <span>{item.token}</span>
                      <span className="text-[10px] text-gray-400">({item.desc})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabs: Editor vs Live Preview */}
              <div className="flex border-b border-gray-200">
                <button
                  type="button"
                  onClick={() => setEmailActiveTab('editor')}
                  className={`pb-2 px-3 text-xs font-semibold transition border-b-2 ${
                    emailActiveTab === 'editor'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Template Editor
                </button>
                <button
                  type="button"
                  onClick={() => setEmailActiveTab('preview')}
                  className={`pb-2 px-3 text-xs font-semibold transition border-b-2 ${
                    emailActiveTab === 'preview'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Live Preview
                </button>
              </div>

              {emailActiveTab === 'editor' ? (
                <div className="space-y-4">
                  {/* Email Subject */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Email Subject <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="e.g. Update regarding your application for {{job_title}}"
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm text-gray-900 shadow-2xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* Email Body */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-gray-700">
                        Email Body Message <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setEmailBody(getDefaultEmailBodyForStage(emailModalStage.name))}
                        className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        Reset to default template
                      </button>
                    </div>
                    <textarea
                      rows={8}
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder="Write your email template message here..."
                      className="w-full rounded-xl border border-gray-300 p-3 text-xs font-mono leading-relaxed text-gray-800 shadow-2xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <p className="text-[11px] text-gray-500">
                    💡 Emails are sent automatically via the organization's SMTP configuration configured in <span className="font-medium text-gray-700">Settings &gt; Email / SMTP</span>.
                  </p>
                </div>
              ) : (
                /* Live Preview Mode */
                <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-3">
                  <div className="text-xs space-y-1 border-b border-gray-200 pb-2.5">
                    <p><span className="font-semibold text-gray-600">To:</span> Jane Candidate &lt;jane.candidate@example.com&gt;</p>
                    <p><span className="font-semibold text-gray-600">Subject:</span>{' '}
                      <span className="font-semibold text-gray-900">
                        {emailSubject
                          .replace(/\{\{candidate_name\}\}/g, 'Jane Candidate')
                          .replace(/\{\{candidate_first_name\}\}/g, 'Jane')
                          .replace(/\{\{job_title\}\}/g, selectedOpening ? selectedOpening.title : 'Senior Full-Stack Engineer')
                          .replace(/\{\{stage_name\}\}/g, emailModalStage.name)
                          .replace(/\{\{company_name\}\}/g, 'Your Company') || '(No Subject)'}
                      </span>
                    </p>
                  </div>
                  <div className="whitespace-pre-wrap font-sans text-xs text-gray-800 leading-relaxed bg-white p-3.5 rounded-lg border border-gray-200 shadow-2xs min-h-[160px]">
                    {emailBody
                      .replace(/\{\{candidate_name\}\}/g, 'Jane Candidate')
                      .replace(/\{\{candidate_first_name\}\}/g, 'Jane')
                      .replace(/\{\{job_title\}\}/g, selectedOpening ? selectedOpening.title : 'Senior Full-Stack Engineer')
                      .replace(/\{\{stage_name\}\}/g, emailModalStage.name)
                      .replace(/\{\{company_name\}\}/g, 'Your Company') || '(No message content)'}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setEmailModalStage(null)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingEmail}
                onClick={() => handleSaveEmailTemplate()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {isSavingEmail ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>Save Email Template</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Stage Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl transition-all">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingStage ? `Edit Stage: ${editingStage.name}` : 'Configure New Recruitment Stage'}
                </h2>
                <p className="text-xs text-gray-500">
                  {selectedOpening ? `Scoped to: ${selectedOpening.title}` : 'Organization Default Pipeline'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveStage} className="mt-4 space-y-4">
              {/* Stage Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Stage Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Technical Round 1, Manager Assessment..."
                  value={formName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormName(val);
                    setFormSlug(
                      val
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)+/g, '')
                    );
                  }}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Stage Code / Slug */}
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Stage Code / Identifier
                </label>
                <input
                  type="text"
                  placeholder="e.g. technical-round-1"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 font-mono text-xs text-gray-700 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Used internally for status workflows and automated candidate tracking.
                </p>
              </div>

              {/* Sequence Order */}
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Pipeline Sequence Position
                </label>
                <input
                  type="number"
                  min={1}
                  value={formOrder}
                  onChange={(e) => setFormOrder(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Theme Color Picker */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Stage Color Theme & Badge Style
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {STAGE_COLOR_PRESETS.map((preset) => (
                    <button
                      type="button"
                      key={preset.key}
                      onClick={() => setFormColor(preset.key)}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition ${
                        formColor === preset.key
                          ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/30'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`h-5 w-5 rounded-full ${preset.bg} shadow-xs flex items-center justify-center`}>
                        {formColor === preset.key && (
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </span>
                      <span className="text-[10px] font-medium text-gray-600 truncate w-full">
                        {preset.label.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3.5">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                  Pipeline Card Preview
                </span>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${selectedPreset.badge}`}>
                    <span className={`h-2 w-2 rounded-full ${selectedPreset.dot}`} />
                    {formName.trim() || 'New Stage'}
                  </span>
                  <span className="text-xs text-gray-400">
                    Will appear in column #{formOrder || 1} of Kanban Board
                  </span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div>
                  {editingStage && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = editingStage;
                        setIsModalOpen(false);
                        setDeleteStageTarget(target);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition"
                    >
                      <svg className="h-4 w-4 text-rose-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                      Delete Stage
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingStage ? 'Update Stage' : 'Create Stage'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteStageTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </span>
              <div>
                <h3 className="text-base font-bold text-gray-900">Delete Recruitment Stage</h3>
                <p className="text-xs text-gray-500">This action cannot be undone.</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-xs text-gray-700">
              Are you sure you want to delete stage <span className="font-semibold text-gray-900">"{deleteStageTarget.name}"</span>?
              {getStageApplicantCount(deleteStageTarget) > 0 && (
                <p className="mt-2 text-rose-600 font-semibold">
                  ⚠️ Note: There are currently {getStageApplicantCount(deleteStageTarget)} candidate(s) in this stage. You must move them to another stage before deleting.
                </p>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteStageTarget(null)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending || getStageApplicantCount(deleteStageTarget) > 0}
                onClick={() => handleDelete(deleteStageTarget)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecruitmentStages;
