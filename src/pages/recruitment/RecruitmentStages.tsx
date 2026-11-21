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
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export const STAGE_COLOR_PRESETS: {
  key: string;
  label: string;
  bg: string;
  dot: string;
  badge: string;
  border: string;
  previewClass: string;
}[] = [
  { key: 'blue', label: 'Blue', bg: 'bg-primary-main', dot: 'bg-primary-main', badge: 'bg-primary-lighter text-primary-dark border-primary-light', border: 'border-primary-light', previewClass: 'from-primary-main to-secondary-main' },
  { key: 'amber', label: 'Amber / Gold', bg: 'bg-warning-main', dot: 'bg-warning-main', badge: 'bg-warning-lighter text-warning-dark border-warning-light', border: 'border-warning-main', previewClass: 'from-warning-main to-warning-main' },
  { key: 'purple', label: 'Purple / Violet', bg: 'bg-secondary-main', dot: 'bg-secondary-main', badge: 'bg-secondary-lighter text-secondary-dark border-secondary-light', border: 'border-secondary-main', previewClass: 'from-secondary-main to-secondary-main' },
  { key: 'emerald', label: 'Emerald / Green', bg: 'bg-success-main', dot: 'bg-success-main', badge: 'bg-success-lighter text-success-dark border-success-light', border: 'border-success-main', previewClass: 'from-success-main to-success-main' },
  { key: 'teal', label: 'Teal / Cyan', bg: 'bg-success-main', dot: 'bg-success-main', badge: 'bg-success-lighter text-success-dark border-success-light', border: 'border-success-main', previewClass: 'from-success-main to-success-main' },
  { key: 'rose', label: 'Rose / Red', bg: 'bg-error-main', dot: 'bg-error-main', badge: 'bg-error-lighter text-error-dark border-error-light', border: 'border-error-main', previewClass: 'from-error-main to-error-main' },
  { key: 'indigo', label: 'Indigo', bg: 'bg-secondary-main', dot: 'bg-secondary-main', badge: 'bg-secondary-lighter text-secondary-dark border-secondary-light', border: 'border-secondary-main', previewClass: 'from-secondary-main to-secondary-main' },
  { key: 'cyan', label: 'Sky Cyan', bg: 'bg-info-main', dot: 'bg-info-main', badge: 'bg-info-lighter text-info-dark border-info-light', border: 'border-info-main', previewClass: 'from-info-main to-primary-main' },
  { key: 'pink', label: 'Pink', bg: 'bg-pink-500', dot: 'bg-pink-500', badge: 'bg-pink-50 text-pink-700 border-pink-200', border: 'border-pink-400', previewClass: 'from-pink-500 to-error-main' },
  { key: 'slate', label: 'Slate Gray', bg: 'bg-grey-500', dot: 'bg-grey-500', badge: 'bg-surface-neutral text-ink-primary border-divider', border: 'border-grey-400', previewClass: 'from-grey-600 to-grey-700' },
];

export function getStagePreset(colorKey: string) {
  const normalized = (colorKey || 'blue').toLowerCase();
  return (
    STAGE_COLOR_PRESETS.find((p) => p.key === normalized) ||
    STAGE_COLOR_PRESETS[0]
  );
}

const STATUS_BADGES: Record<JobOpeningStatus, { label: string; badge: string; dot: string }> = {
  open: { label: 'Open', badge: 'bg-success-lighter text-success-dark border-success-light', dot: 'bg-success-main' },
  closed: { label: 'Closed', badge: 'bg-surface-neutral text-ink-primary border-divider', dot: 'bg-grey-400' },
  on_hold: { label: 'On Hold', badge: 'bg-warning-lighter text-warning-dark border-warning-light', dot: 'bg-warning-main' },
  cancelled: { label: 'Cancelled', badge: 'bg-error-lighter text-error-dark border-error-light', dot: 'bg-error-main' },
};

export function RecruitmentStages() {
  const { showToast } = useToast();
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
      showToast(typeof msg === 'string' ? msg : JSON.stringify(msg), 'error');
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
      showToast(typeof msg === 'string' ? msg : JSON.stringify(msg), 'error');
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
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-main text-primary-contrast shadow-sm">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                </svg>
              </span>
              <h1 className="text-2xl font-bold text-ink-primary">Recruitment Stages</h1>
            </div>
            <p className="mt-1 text-sm text-ink-secondary">
              Configure custom hiring pipeline stages for each job opening, or manage organization defaults.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/recruitment/pipeline"
              className="inline-flex items-center gap-1.5 rounded-lg border border-divider bg-surface-paper px-3.5 py-2 text-sm font-medium text-ink-primary shadow-sm transition hover:bg-surface-neutral focus:outline-none focus:ring-2 focus:ring-secondary-main"
            >
              <svg className="h-4 w-4 text-ink-secondary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z" />
              </svg>
              View Pipeline Board
            </Link>
          </div>
        </div>

        {/* Global Default Stages Highlight Card */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-secondary-lighter bg-gradient-to-r from-secondary-lighter/70 via-surface-paper to-secondary-lighter/50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-main text-primary-contrast shadow-sm">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.27-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-ink-primary">Organization Default Stages</h3>
                  <span className="inline-flex items-center rounded-full bg-secondary-lighter px-2.5 py-0.5 text-xs font-semibold text-secondary-dark">
                    {defaultStages.length} Stages Configured
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-secondary max-w-2xl">
                  Standard baseline pipeline inherited by any job opening without customized stages. Edit the default template or configure job-specific stages below.
                </p>
              </div>
            </div>

            <Button type="button" variant="outlined" color="inherit" size="small"
              onClick={() => setSearchParams({ job: 'default' })}
            >
              Configure Default Template
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-disabled"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <Input
              type="text"
              placeholder="Search by job title or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-ink-secondary">Status:</span>
            <div className="inline-flex rounded-lg border border-divider bg-surface-paper p-0.5 shadow-2xs">
              {['all', 'open', 'closed', 'on_hold'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition ${
                    statusFilter === st
                      ? 'bg-secondary-main text-primary-contrast shadow-xs'
                      : 'text-ink-secondary hover:text-ink-primary'
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
          <div className="rounded-2xl border border-divider bg-surface-paper p-12 text-center shadow-sm">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-secondary-main border-r-transparent"></div>
            <p className="mt-3 text-sm font-medium text-ink-secondary">Loading job openings...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoadingOpenings && filteredOpenings.length === 0 && (
          <div className="rounded-2xl border border-dashed border-divider bg-surface-paper p-12 text-center shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary-lighter text-secondary-main">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </div>
            <h3 className="mt-3 text-base font-semibold text-ink-primary">No Job Openings Found</h3>
            <p className="mt-1 text-sm text-ink-secondary">
              {searchTerm ? 'No job openings match your search filter.' : 'Create your first job opening to configure stages.'}
            </p>
            <Link
              to="/recruitment"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-secondary-main px-4 py-2 text-xs font-semibold text-primary-contrast shadow-xs hover:bg-secondary-dark"
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
                  className="group relative flex flex-col justify-between rounded-2xl border border-grey-300/90 bg-surface-paper p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-secondary-light hover:shadow-md"
                >
                  <div>
                    {/* Header: Status & Vacancies */}
                    <div className="mb-3 flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${statusCfg.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                      <span className="text-xs font-medium text-ink-disabled">
                        {job.vacancies} {job.vacancies === 1 ? 'vacancy' : 'vacancies'}
                      </span>
                    </div>

                    {/* Job Title */}
                    <h3 className="text-lg font-bold text-ink-primary group-hover:text-secondary-main transition-colors">
                      {job.title}
                    </h3>

                    {/* Department / Designation */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-secondary">
                      {job.department_name && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-surface-neutral px-2 py-0.5 font-medium text-ink-primary">
                          <svg className="h-3 w-3 text-ink-disabled" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.75c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.75h-4.5" />
                          </svg>
                          {job.department_name}
                        </span>
                      )}
                      {job.designation_name && (
                        <span className="inline-flex items-center rounded-md bg-surface-neutral px-2 py-0.5 text-ink-secondary border border-divider">
                          {job.designation_name}
                        </span>
                      )}
                    </div>

                    {/* Pipeline Stage Status Badge */}
                    <div className="mt-4 rounded-xl border border-divider bg-surface-neutral/70 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-ink-secondary">Hiring Pipeline:</span>
                        {hasCustom ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary-lighter px-2.5 py-0.5 text-xs font-semibold text-secondary-dark">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                            </svg>
                            Custom ({stageCount} Stages)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-surface-neutral px-2.5 py-0.5 text-xs font-semibold text-ink-primary">
                            <svg className="h-3 w-3 text-ink-disabled" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>
                            Default ({stageCount} Stages)
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-ink-disabled">
                        <span>{job.applicant_count || 0} active candidate(s)</span>
                        <span>{hasCustom ? 'Job-specific workflow' : 'Inherits default template'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Action */}
                  <div className="mt-5 pt-3 border-t border-divider">
                    <button
                      onClick={() => setSearchParams({ job: job.id })}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-secondary-lighter py-2.5 text-xs font-semibold text-secondary-dark transition hover:bg-secondary-main hover:text-primary-contrast"
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
          className="inline-flex items-center gap-2 text-xs font-semibold text-ink-secondary hover:text-secondary-main transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to All Job Openings
        </button>

        {/* Quick job switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-disabled">Switch Job:</span>
          <Select
            value={isDefaultPipeline ? 'default' : selectedJobId || ''}
            onChange={(e) => setSearchParams(e.target.value ? { job: e.target.value } : {})}
            className="font-medium"
          >
            <option value="default">📋 Organization Defaults</option>
            {jobOpenings.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} {j.has_custom_stages ? '(Custom)' : ''}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Top Banner & Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-secondary-main text-primary-contrast shadow-sm">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
              </svg>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-ink-primary">{pageTitle}</h1>
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
              <p className="mt-1 text-xs text-ink-secondary">
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-divider bg-surface-paper px-3.5 py-2 text-sm font-medium text-ink-primary shadow-sm transition hover:bg-surface-neutral focus:outline-none focus:ring-2 focus:ring-secondary-main"
          >
            <svg className="h-4 w-4 text-ink-secondary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
            View Pipeline Board
          </Link>

          {/* Copy defaults button if opening has no custom stages */}
          {selectedOpening && sortedStages.length === 0 && (
            <button
              onClick={handleInitializeDefaults}
              disabled={initializeMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-secondary-light bg-secondary-lighter px-3.5 py-2 text-sm font-semibold text-secondary-dark shadow-sm transition hover:bg-secondary-lighter disabled:opacity-50"
            >
              <svg className="h-4 w-4 text-secondary-main" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
              </svg>
              {initializeMutation.isPending ? 'Copying...' : 'Copy Default Stages'}
            </button>
          )}

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-secondary-main px-4 py-2 text-sm font-semibold text-primary-contrast shadow-sm transition hover:bg-secondary-dark focus:outline-none focus:ring-2 focus:ring-secondary-main"
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
        <div className="mb-6 flex items-center justify-between rounded-xl border border-success-light bg-success-lighter px-4 py-3 text-sm text-success-dark shadow-sm transition-all animate-fadeIn">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-success-main" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-success-main hover:text-success-dark">
            ✕
          </button>
        </div>
      )}

      {/* Notice banner if this job opening has no custom stages configured yet */}
      {selectedOpening && sortedStages.length === 0 && !isLoadingStages && (
        <div className="mb-6 rounded-2xl border border-warning-light bg-warning-lighter/80 p-5 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-lighter text-warning-dark">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
              </span>
              <div>
                <h4 className="text-sm font-bold text-warning-darker">
                  Using Organization Default Pipeline ({defaultStages.length} Stages)
                </h4>
                <p className="mt-0.5 text-xs text-warning-dark">
                  This job opening does not have a custom stage flow yet. It currently uses the standard default stages.
                  You can copy the default stages to customize them for this position, or add custom stages directly.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleInitializeDefaults}
                disabled={initializeMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-warning-main px-3.5 py-2 text-xs font-bold text-primary-contrast shadow-xs hover:bg-warning-dark disabled:opacity-50"
              >
                ⚡ Copy Organization Defaults
              </button>
              <Button type="button" variant="outlined" color="inherit" size="small"
                onClick={openCreateModal}
              >
                + Add Stage From Scratch
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Visual Stepper Preview */}
      {sortedStages.length > 0 && (
        <div className="mb-8 rounded-2xl border border-grey-300/80 bg-gradient-to-b from-surface-paper to-grey-50/50 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
              Hiring Pipeline Flow ({sortedStages.length} Stages)
            </h2>
            <span className="text-xs text-ink-disabled">Sequence from candidate application to completion</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {sortedStages.map((stage, idx) => {
              const preset = getStagePreset(stage.color);
              return (
                <div key={stage.id} className="flex items-center gap-2 shrink-0">
                  <div
                    className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition shadow-sm ${preset.badge}`}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-paper/80 text-[10px] font-bold shadow-xs">
                      {idx + 1}
                    </span>
                    <span>{stage.name}</span>
                    <span className="ml-1 rounded-full bg-surface-paper/90 px-1.5 py-0.5 text-[10px] font-semibold text-ink-secondary">
                      {getStageApplicantCount(stage)}
                    </span>
                  </div>
                  {idx < sortedStages.length - 1 && (
                    <svg className="h-4 w-4 text-grey-300 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
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
        <div className="rounded-2xl border border-divider bg-surface-paper p-12 text-center shadow-sm">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-secondary-main border-r-transparent"></div>
          <p className="mt-3 text-sm font-medium text-ink-secondary">Loading stages...</p>
        </div>
      )}

      {isStageError && (
        <div className="rounded-2xl border border-error-light bg-error-lighter p-6 text-center text-error-dark shadow-sm">
          <p className="font-semibold">Unable to load recruitment stages</p>
          <p className="mt-1 text-sm text-error-main">
            {(stageError as any)?.message || 'Please check your connection and try again.'}
          </p>
        </div>
      )}

      {/* Main Stages Cards / Table */}
      {!isLoadingStages && !isStageError && sortedStages.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-grey-300/90 bg-surface-paper shadow-sm">
          <div className="border-b border-divider bg-surface-neutral/75 px-6 py-3.5">
            <div className="grid grid-cols-12 text-xs font-semibold uppercase tracking-wider text-ink-secondary">
              <div className="col-span-1">Order</div>
              <div className="col-span-4">Stage Name</div>
              <div className="col-span-2">Color Theme</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-1 text-center">Candidates</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
          </div>

          <div className="divide-y divide-divider">
            {sortedStages.map((stage, index) => {
              const preset = getStagePreset(stage.color);
              return (
                <div
                  key={stage.id}
                  className="grid grid-cols-12 items-center px-6 py-4 transition hover:bg-surface-neutral/80"
                >
                  {/* Order & Reorder Controls */}
                  <div className="col-span-1 flex items-center gap-1.5">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-surface-neutral text-xs font-bold text-ink-primary">
                      #{stage.order}
                    </span>
                    <div className="flex flex-col">
                      <button
                        onClick={() => handleMove(index, 'up')}
                        disabled={index === 0 || reorderMutation.isPending}
                        title="Move Up"
                        className="rounded p-0.5 text-ink-disabled hover:bg-grey-200 hover:text-ink-primary disabled:opacity-20 disabled:hover:bg-transparent"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleMove(index, 'down')}
                        disabled={index === sortedStages.length - 1 || reorderMutation.isPending}
                        title="Move Down"
                        className="rounded p-0.5 text-ink-disabled hover:bg-grey-200 hover:text-ink-primary disabled:opacity-20 disabled:hover:bg-transparent"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Stage Name & Slug */}
                  <div className="col-span-4 flex items-center gap-3">
                    <span className={`h-3 w-3 shrink-0 rounded-full ${preset.dot}`} />
                    <div>
                      <h3 className="text-sm font-semibold text-ink-primary">{stage.name}</h3>
                      <p className="font-mono text-xs text-ink-disabled">code: {stage.slug}</p>
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
                  <div className="col-span-2">
                    {stage.is_system ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-surface-neutral px-2 py-1 text-xs font-medium text-ink-primary">
                        <svg className="h-3 w-3 text-ink-secondary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                        System Default
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-secondary-lighter px-2 py-1 text-xs font-medium text-secondary-dark">
                        <svg className="h-3 w-3 text-secondary-main" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63" />
                        </svg>
                        Custom Stage
                      </span>
                    )}
                  </div>

                  {/* Candidate Count */}
                  <div className="col-span-1 text-center">
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-surface-neutral px-2 text-xs font-semibold text-ink-primary">
                      {getStageApplicantCount(stage)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditModal(stage)}
                      className="inline-flex items-center gap-1 rounded-lg border border-divider px-2.5 py-1.5 text-xs font-semibold text-ink-primary hover:bg-surface-neutral transition shadow-2xs"
                    >
                      <svg className="h-3.5 w-3.5 text-ink-secondary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteStageTarget(stage)}
                      className="inline-flex items-center gap-1 rounded-lg border border-error-light px-2.5 py-1.5 text-xs font-semibold text-error-main hover:bg-error-lighter hover:border-error-light transition shadow-2xs"
                      title={`Delete stage ${stage.name}`}
                    >
                      <svg className="h-3.5 w-3.5 text-error-main" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
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

      {/* Add / Edit Stage Modal */}
      {isModalOpen && (
        <Modal open onClose={() => setIsModalOpen(false)} labelledBy="RecruitmentStages-modal-title-1" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-divider pb-4">
              <div>
                <h2 id="RecruitmentStages-modal-title-1" className="text-lg font-bold text-ink-primary">
                  {editingStage ? `Edit Stage: ${editingStage.name}` : 'Configure New Recruitment Stage'}
                </h2>
                <p className="text-xs text-ink-secondary">
                  {selectedOpening ? `Scoped to: ${selectedOpening.title}` : 'Organization Default Pipeline'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-md p-1 text-ink-disabled hover:bg-surface-neutral hover:text-ink-secondary"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-xl border border-error-light bg-error-lighter p-3 text-xs text-error-dark">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveStage} className="mt-4 space-y-4">
              {/* Stage Name */}
              <div>
                <label className="block text-xs font-medium text-ink-primary">
                  Stage Name <span className="text-error-main">*</span>
                </label>
                <Input
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
                  className="mt-1"
                />
              </div>

              {/* Stage Code / Slug */}
              <div>
                <label className="block text-xs font-medium text-ink-primary">
                  Stage Code / Identifier
                </label>
                <Input
                  type="text"
                  placeholder="e.g. technical-round-1"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  className="mt-1 font-mono"
                />
                <p className="mt-1 text-[11px] text-ink-disabled">
                  Used internally for status workflows and automated candidate tracking.
                </p>
              </div>

              {/* Sequence Order */}
              <div>
                <label className="block text-xs font-medium text-ink-primary">
                  Pipeline Sequence Position
                </label>
                <Input
                  type="number"
                  min={1}
                  value={formOrder}
                  onChange={(e) => setFormOrder(Number(e.target.value))}
                  className="mt-1"
                />
              </div>

              {/* Theme Color Picker */}
              <div>
                <label className="block text-xs font-medium text-ink-primary mb-2">
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
                          ? 'border-secondary-main bg-secondary-lighter/50 ring-2 ring-secondary-main/30'
                          : 'border-divider hover:border-divider hover:bg-surface-neutral'
                      }`}
                    >
                      <span className={`h-5 w-5 rounded-full ${preset.bg} shadow-xs flex items-center justify-center`}>
                        {formColor === preset.key && (
                          <svg className="h-3 w-3 text-primary-contrast" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </span>
                      <span className="text-[10px] font-medium text-ink-secondary truncate w-full">
                        {preset.label.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="rounded-xl border border-divider bg-surface-neutral/80 p-3.5">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-secondary mb-1.5">
                  Pipeline Card Preview
                </span>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${selectedPreset.badge}`}>
                    <span className={`h-2 w-2 rounded-full ${selectedPreset.dot}`} />
                    {formName.trim() || 'New Stage'}
                  </span>
                  <span className="text-xs text-ink-disabled">
                    Will appear in column #{formOrder || 1} of Kanban Board
                  </span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-divider">
                <div>
                  {editingStage && (
                    <Button variant="outlined" color="inherit" size="small"
                      type="button"
                      onClick={() => {
                        const target = editingStage;
                        setIsModalOpen(false);
                        setDeleteStageTarget(target);
                      }}
                    >
                      <svg className="h-4 w-4 text-error-main" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                      Delete Stage
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outlined" color="inherit"
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="rounded-xl bg-secondary-main px-5 py-2 text-sm font-semibold text-primary-contrast shadow-sm hover:bg-secondary-dark disabled:opacity-50"
                  >
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingStage ? 'Update Stage' : 'Create Stage'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteStageTarget && (
        <Modal open onClose={() => setDeleteStageTarget(null)} labelledBy="RecruitmentStages-modal-title-2" size="sm" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-error-lighter text-error-main">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </span>
              <div>
                <h3 id="RecruitmentStages-modal-title-2" className="text-base font-bold text-ink-primary">Delete Recruitment Stage</h3>
                <p className="text-xs text-ink-secondary">This action cannot be undone.</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-divider bg-surface-neutral p-3.5 text-xs text-ink-primary">
              Are you sure you want to delete stage <span className="font-semibold text-ink-primary">"{deleteStageTarget.name}"</span>?
              {getStageApplicantCount(deleteStageTarget) > 0 && (
                <p className="mt-2 text-error-main font-semibold">
                  ⚠️ Note: There are currently {getStageApplicantCount(deleteStageTarget)} candidate(s) in this stage. You must move them to another stage before deleting.
                </p>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <Button variant="outlined" color="inherit"
                type="button"
                onClick={() => setDeleteStageTarget(null)}
              >
                Cancel
              </Button>
              <button
                type="button"
                disabled={deleteMutation.isPending || getStageApplicantCount(deleteStageTarget) > 0}
                onClick={() => handleDelete(deleteStageTarget)}
                className="rounded-xl bg-error-main px-4 py-2 text-sm font-semibold text-primary-contrast shadow-sm hover:bg-error-dark disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default RecruitmentStages;
