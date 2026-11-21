/**
 * Applicant Pipeline page — kanban-style view of applicants grouped by stage.
 * Supports filtering by job opening, employee referral badges, and moving selected candidates to onboarding.
 * Requirements: 19.2, 24.2
 */

import { useState, useMemo } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApplicants, useChangeApplicantStatus, useJobOpenings, useRecruitmentStages } from '@/hooks/useRecruitment';
import { getStagePreset } from './RecruitmentStages';
import { CreateButton } from '@/components/ActionButton';
import { CrudModal } from '@/components/CrudModal';
import type { FieldConfig } from '@/components/CrudModal';
import api from '@/lib/api';
import type { ApplicantStatus, JobApplicant } from '@/types/recruitment';
import { Modal } from '@/components/ui/Modal';
import { Button, ButtonLink, IconButton } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Iconify } from '@/components/Iconify';
import { Card } from '@/components/ui/Card';

const APPLICANT_FIELDS: FieldConfig[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'email', label: 'Email', type: 'text', required: true, placeholder: 'applicant@example.com' },
  { key: 'phone', label: 'Phone', type: 'text', placeholder: '+91...' },
  { key: 'job_opening', label: 'Job Opening', type: 'select', optionsEndpoint: '/api/v1/recruitment/job-openings/', optionsLabelKey: 'title' },
  { key: 'resume_url', label: 'Resume URL', type: 'text', placeholder: 'https://...' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

const PIPELINE_STAGES: { key: ApplicantStatus; label: string; color: string }[] = [
  { key: 'applied', label: 'Applied', color: 'border-primary-light bg-primary-lighter' },
  { key: 'screening', label: 'Screening', color: 'border-warning-main bg-warning-lighter' },
  { key: 'interview', label: 'Interview', color: 'border-secondary-main bg-secondary-lighter' },
  { key: 'selected', label: 'Selected', color: 'border-success-main bg-success-lighter' },
  { key: 'onboarded', label: 'Onboarded', color: 'border-success-main bg-success-lighter' },
  { key: 'rejected', label: 'Rejected', color: 'border-error-main bg-error-lighter' },
];

interface ApplicantPipelineProps {
  jobOpeningId?: string;
  onBack?: () => void;
}

export function ApplicantPipeline({ jobOpeningId, onBack }: ApplicantPipelineProps) {
  const [selectedJobOpening, setSelectedJobOpening] = useState(jobOpeningId || '');
  const [showCreate, setShowCreate] = useState(false);
  const [onboardingApplicant, setOnboardingApplicant] = useState<JobApplicant | null>(null);
  const [onboardSuccessMessage, setOnboardSuccessMessage] = useState<string | null>(null);
  const [onboardErrorMessage, setOnboardErrorMessage] = useState<string | null>(null);

  // Cancellation / Revoke offer modal state
  const [cancellingApplicant, setCancellingApplicant] = useState<JobApplicant | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSuccessMessage, setCancelSuccessMessage] = useState<string | null>(null);
  const [cancelErrorMessage, setCancelErrorMessage] = useState<string | null>(null);

  // Reject candidate modal state linked to Settings Candidate Reject Reasons
  const [rejectingApplicant, setRejectingApplicant] = useState<JobApplicant | null>(null);
  const [selectedRejectReason, setSelectedRejectReason] = useState<string>('');
  const [rejectNotes, setRejectNotes] = useState<string>('');

  // Dynamically load configured reject reasons from Recruitment Settings
  const configuredRejectReasons = useMemo(() => {
    try {
      const saved = localStorage.getItem('hrms_candidate_reject_reasons');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((r: any) => r.isActive !== false);
        }
      }
    } catch {
      // fallback
    }
    return [
      { id: '1', title: 'Skill Set & Experience Mismatch', description: 'Technical skills do not align' },
      { id: '2', title: 'Salary Expectation Exceeds Budget', description: 'CTC exceeds approved budget' },
      { id: '3', title: 'Notice Period Too Long', description: 'Notice period exceeds requirement' },
      { id: '4', title: 'Did Not Clear Technical Assessment', description: 'Scored below cutoff' },
      { id: '5', title: 'Candidate Withdrew / Accepted Counter Offer', description: 'Declined or accepted other offer' },
      { id: '6', title: 'Location / Shift Incompatibility', description: 'Unwilling or unable to relocate' },
    ];
  }, []);

  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/api/v1/recruitment/applicants/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicants'] });
      queryClient.invalidateQueries({ queryKey: ['recruitment-stages'] });
      setShowCreate(false);
    },
  });

  // Mutation to hire / move applicant to onboarding
  const onboardMutation = useMutation({
    mutationFn: async (applicantId: string) => {
      const res = await api.post(`/api/v1/recruitment/applicants/${applicantId}/hire/`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['applicants'] });
      queryClient.invalidateQueries({ queryKey: ['recruitment-stages'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-referrals'] });
      setOnboardSuccessMessage(data?.message || 'Applicant successfully moved to onboarding!');
      setOnboardingApplicant(null);
      setOnboardErrorMessage(null);
      setTimeout(() => setOnboardSuccessMessage(null), 6000);
    },
    onError: (err: any) => {
      const resp = err.response?.data;
      const msg = resp?.error?.message || resp?.error || resp?.detail || 'Failed to move applicant to onboarding.';
      setOnboardErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
    },
  });

  // Mutation to cancel onboarding / revoke offer
  const cancelOnboardMutation = useMutation({
    mutationFn: async ({ applicantId, reason }: { applicantId: string; reason: string }) => {
      const res = await api.post(`/api/v1/recruitment/applicants/${applicantId}/cancel-onboarding/`, { reason });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['applicants'] });
      queryClient.invalidateQueries({ queryKey: ['recruitment-stages'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-referrals'] });
      setCancelSuccessMessage(data?.message || 'Onboarding cancelled and employee profile removed.');
      setCancellingApplicant(null);
      setCancelReason('');
      setCancelErrorMessage(null);
      setTimeout(() => setCancelSuccessMessage(null), 6000);
    },
    onError: (err: any) => {
      const resp = err.response?.data;
      const msg = resp?.error?.message || resp?.error || resp?.detail || 'Failed to cancel onboarding.';
      setCancelErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
    },
  });

  // Fetch job openings for the dropdown filter
  const { data: openingsData } = useJobOpenings({ page_size: 100 });

  // Fetch all applicants for the selected job opening (or all)
  const { data: applicantsData, isLoading, isError, error } = useApplicants({
    job_opening: selectedJobOpening || undefined,
    page_size: 200, // load all for kanban view
  });

  // Fetch configured recruitment stages from the backend
  const { data: dbStages = [] } = useRecruitmentStages();

  const changeStatus = useChangeApplicantStatus();

  // Active dynamic stages for the pipeline kanban board
  const activeStages = useMemo(() => {
    if (dbStages && dbStages.length > 0) {
      const sorted = [...dbStages].sort((a, b) => a.order - b.order);
      return sorted.map((s) => {
        const preset = getStagePreset(s.color);
        return {
          key: s.slug as ApplicantStatus,
          label: s.name,
          color: `${preset.border} ${preset.badge}`,
          border: preset.border,
          dot: preset.dot,
          badge: preset.badge,
        };
      });
    }
    return PIPELINE_STAGES.map((s) => ({
      ...s,
      border: s.color.split(' ')[0],
      dot: 'bg-secondary-main',
      badge: s.color,
    }));
  }, [dbStages]);

  // Group applicants by dynamic stage slug
  const groupedApplicants = useMemo(() => {
    const map: Record<string, JobApplicant[]> = {};
    for (const st of activeStages) {
      map[st.key] = [];
    }
    if (applicantsData) {
      for (const applicant of applicantsData.results) {
        const key = applicant.status;
        if (!map[key]) {
          map[key] = [];
        }
        map[key].push(applicant);
      }
    }
    return map;
  }, [activeStages, applicantsData]);

  const handleMoveApplicant = (applicantId: string, newStatus: ApplicantStatus) => {
    if (newStatus === 'onboarded') {
      // Guardrail: Always ask for confirmation before moving to onboarding
      const target = applicantsData?.results.find((a) => a.id === applicantId);
      if (target) {
        setOnboardErrorMessage(null);
        setOnboardingApplicant(target);
        return;
      }
    }
    if (newStatus === 'rejected') {
      // Prompt user for rejection reason linked to Recruitment Settings
      const target = applicantsData?.results.find((a) => a.id === applicantId);
      if (target) {
        setRejectingApplicant(target);
        setSelectedRejectReason(configuredRejectReasons[0]?.title || 'Skill Set & Experience Mismatch');
        setRejectNotes('');
        return;
      }
    }
    changeStatus.mutate({ id: applicantId, payload: { status: newStatus } });
  };

  const handleConfirmReject = () => {
    if (!rejectingApplicant) return;
    const combinedNotes = rejectNotes?.trim()
      ? `[${selectedRejectReason}] ${rejectNotes.trim()}`
      : selectedRejectReason;

    changeStatus.mutate(
      {
        id: rejectingApplicant.id,
        payload: {
          status: 'rejected',
          notes: combinedNotes,
        },
      },
      {
        onSuccess: () => {
          setRejectingApplicant(null);
          setSelectedRejectReason('');
          setRejectNotes('');
        },
      }
    );
  };

  const handleConfirmOnboarding = () => {
    if (!onboardingApplicant) return;
    setOnboardErrorMessage(null);
    onboardMutation.mutate(onboardingApplicant.id);
  };

  const handleConfirmCancelOnboarding = () => {
    if (!cancellingApplicant) return;
    setCancelErrorMessage(null);
    cancelOnboardMutation.mutate({
      applicantId: cancellingApplicant.id,
      reason: cancelReason,
    });
  };

  return (
    <div>
      {/* Onboard Success Notification */}
      {onboardSuccessMessage && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-success-lighter border border-success-light p-4 text-sm text-success-dark shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-success-main" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-semibold">{onboardSuccessMessage}</span>
          </div>
          <IconButton icon="close" size="small" color="success" aria-label="Dismiss" onClick={() => setOnboardSuccessMessage(null)} />
        </div>
      )}

      {/* Revoke/Cancel Success Notification */}
      {cancelSuccessMessage && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-error-lighter border border-error-light p-4 text-sm text-error-dark shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-error-main" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-semibold">{cancelSuccessMessage}</span>
          </div>
          <IconButton icon="close" size="small" color="error" aria-label="Dismiss" onClick={() => setCancelSuccessMessage(null)} />
        </div>
      )}

      {/* Stage Change Error Notification */}
      {changeStatus.isError && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-error-lighter border border-error-light p-4 text-sm text-error-dark shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-error-main" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              {(changeStatus.error as any)?.response?.data?.error ||
                (changeStatus.error as any)?.response?.data?.detail ||
                'Failed to update stage. Please try again.'}
            </span>
          </div>
          <IconButton icon="close" size="small" color="error" aria-label="Dismiss" onClick={() => changeStatus.reset()} />
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <IconButton icon="arrow-left" aria-label="Go back" onClick={onBack} />
          )}
          <div>
            <h2 className="text-lg font-semibold text-ink-primary">Applicant Pipeline</h2>
            <p className="mt-0.5 text-sm text-ink-secondary">
              {applicantsData ? `${applicantsData.count} applicant${applicantsData.count !== 1 ? 's' : ''}` : 'Loading...'}
            </p>
          </div>
        </div>

        {/* Actions & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink to="/recruitment/stages" variant="outlined" color="inherit" startIcon={<Iconify icon="settings" />}>
            Configure Stages
          </ButtonLink>
          <CreateButton permission="recruitment.create" label="Add Applicant" onClick={() => setShowCreate(true)} />
          <Select
            selectSize="small"
            value={selectedJobOpening}
            onChange={(e) => setSelectedJobOpening(e.target.value)}
            aria-label="Filter by job opening"
          >
            <option value="">All Job Openings</option>
            {openingsData?.results.map((opening) => (
              <option key={opening.id} value={opening.id}>
                {opening.title}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary-main border-t-transparent" />
          <span className="ml-3 text-sm text-ink-secondary">Loading applicants...</span>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-md bg-error-lighter p-4">
          <p className="text-sm text-error-dark">
            Failed to load applicants. {error instanceof Error ? error.message : 'Please try again.'}
          </p>
        </div>
      )}

      {/* Kanban Board */}
      {applicantsData && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {activeStages.map((stage) => {
            const applicants = groupedApplicants[stage.key] || [];
            return (
              <Card key={stage.key} className={`min-w-[270px] flex-1 border-t-4 p-3 ${stage.border}`}>
                {/* Column Header */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${stage.dot}`} />
                    <h3 className="text-sm font-semibold text-ink-primary">{stage.label}</h3>
                  </div>
                  <span className="rounded-full bg-surface-neutral px-2 py-0.5 text-xs font-semibold text-ink-secondary">
                    {applicants.length}
                  </span>
                </div>

                {/* Applicant Cards */}
                <div className="space-y-2">
                  {applicants.length === 0 && (
                    <p className="py-6 text-center text-xs text-ink-disabled">No applicants</p>
                  )}
                  {applicants.map((applicant) => (
                    <ApplicantCard
                      key={applicant.id}
                      applicant={applicant}
                      currentStage={stage.key}
                      availableStages={activeStages}
                      onMove={handleMoveApplicant}
                      onInitiateOnboarding={(app) => {
                        setOnboardErrorMessage(null);
                        setOnboardingApplicant(app);
                      }}
                      onCancelOnboarding={(app) => {
                        setCancelErrorMessage(null);
                        setCancelReason('');
                        setCancellingApplicant(app);
                      }}
                      isMoving={
                        changeStatus.isPending ||
                        onboardMutation.isPending ||
                        cancelOnboardMutation.isPending
                      }
                    />
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Applicant Modal */}
      <CrudModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add Applicant"
        fields={APPLICANT_FIELDS}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      {/* Move to Onboarding Confirmation Modal */}
      {onboardingApplicant && (
        <Modal open onClose={() => setOnboardingApplicant(null)} labelledBy="ApplicantPipeline-modal-title-1" size="sm" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-success-lighter text-success-main">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 id="ApplicantPipeline-modal-title-1" className="text-base font-semibold text-ink-primary">Move to Onboarding</h3>
                <p className="mt-1 text-xs text-ink-secondary">
                  You are about to initiate the employee onboarding cycle for this candidate.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-surface-neutral p-3.5 text-xs text-ink-primary space-y-1.5 border border-grey-300/80">
              <div className="flex justify-between">
                <span className="text-ink-secondary">Candidate:</span>
                <span className="font-semibold text-ink-primary">{onboardingApplicant.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-secondary">Email:</span>
                <span className="font-mono text-ink-primary">{onboardingApplicant.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-secondary">Job Opening:</span>
                <span className="font-medium text-ink-primary">{onboardingApplicant.job_opening?.title || '—'}</span>
              </div>
              {onboardingApplicant.referred_by_name && (
                <div className="flex justify-between text-warning-dark">
                  <span>Referral By:</span>
                  <span className="font-semibold">{onboardingApplicant.referred_by_name}</span>
                </div>
              )}
            </div>

            <ul className="mt-3.5 space-y-1 text-[11px] text-ink-secondary list-disc list-inside">
              <li>Creates new employee profile in the employee directory</li>
              <li>Sets employee onboarding status to <strong className="text-ink-primary">Pending</strong></li>
              <li>Sends an account setup invitation to the candidate's email</li>
              <li>Transitions recruitment pipeline status to <strong className="text-success-dark">Onboarded</strong></li>
            </ul>

            {onboardErrorMessage && (
              <div className="mt-3 rounded-lg bg-error-lighter p-2.5 text-xs text-error-dark border border-error-light">
                {onboardErrorMessage}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <Button variant="outlined" color="inherit" size="small"
                type="button"
                onClick={() => setOnboardingApplicant(null)}
                disabled={onboardMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                color="success"
                onClick={handleConfirmOnboarding}
                loading={onboardMutation.isPending}
                startIcon={<Iconify icon="check" />}
              >
                {onboardMutation.isPending ? 'Processing...' : 'Confirm & Move to Onboarding'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Revoke Offer / Cancel Onboarding Confirmation Modal */}
      {cancellingApplicant && (
        <Modal open onClose={() => setCancellingApplicant(null)} labelledBy="ApplicantPipeline-modal-title-2" size="sm" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-error-lighter text-error-main">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 id="ApplicantPipeline-modal-title-2" className="text-base font-semibold text-ink-primary">Revoke Offer / Cancel Onboarding</h3>
                <p className="mt-1 text-xs text-ink-secondary">
                  Onboarding represents completed recruitment. If this candidate backed out or the offer was revoked, confirm below.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-surface-neutral p-3.5 text-xs text-ink-primary space-y-1.5 border border-grey-300/80">
              <div className="flex justify-between">
                <span className="text-ink-secondary">Candidate:</span>
                <span className="font-semibold text-ink-primary">{cancellingApplicant.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-secondary">Email:</span>
                <span className="font-mono text-ink-primary">{cancellingApplicant.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-secondary">Job Opening:</span>
                <span className="font-medium text-ink-primary">{cancellingApplicant.job_opening?.title || '—'}</span>
              </div>
            </div>

            <div className="mt-3.5 space-y-1 text-[11px] text-ink-secondary rounded-lg bg-warning-lighter/70 p-3 border border-warning-light/80">
              <p className="font-semibold text-warning-darker">Confirming this action will:</p>
              <ul className="list-disc list-inside space-y-0.5 text-warning-dark">
                <li>Remove the employee profile from the Employee Directory</li>
                <li>Deactivate their login account in Identity Center</li>
                <li>Move recruitment status to <strong className="text-error-dark">Rejected</strong></li>
              </ul>
            </div>

            <div className="mt-4">
              <label htmlFor="cancel-reason" className="block text-xs font-medium text-ink-primary mb-1">
                Reason for cancellation <span className="text-ink-disabled font-normal">(optional)</span>
              </label>
              {configuredRejectReasons.length > 0 && (
                <Select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="mb-2"
                >
                  <option value="">-- Select from configured reject reasons --</option>
                  {configuredRejectReasons.map((r: any) => (
                    <option key={r.id} value={r.title}>
                      {r.title}
                    </option>
                  ))}
                </Select>
              )}
              <Textarea
                id="cancel-reason"
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Candidate backed out / accepted counter-offer, failed check..."
              />
            </div>

            {cancelErrorMessage && (
              <div className="mt-3 rounded-lg bg-error-lighter p-2.5 text-xs text-error-dark border border-error-light">
                {cancelErrorMessage}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <Button variant="outlined" color="inherit" size="small"
                type="button"
                onClick={() => {
                  setCancellingApplicant(null);
                  setCancelReason('');
                  setCancelErrorMessage(null);
                }}
                disabled={cancelOnboardMutation.isPending}
              >
                Keep Onboarded
              </Button>
              <Button
                color="error"
                onClick={handleConfirmCancelOnboarding}
                loading={cancelOnboardMutation.isPending}
                startIcon={<Iconify icon="trash" />}
              >
                {cancelOnboardMutation.isPending ? 'Processing...' : 'Confirm Revoke Offer'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Candidate Modal Linked to Settings Rejection Reasons */}
      {rejectingApplicant && (
        <Modal open onClose={() => setRejectingApplicant(null)} labelledBy="ApplicantPipeline-modal-title-3" size="sm" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="p-6 min-h-0 flex-1 overflow-y-auto">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-error-lighter text-error-main">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h3 id="ApplicantPipeline-modal-title-3" className="text-base font-semibold text-ink-primary">Reject Candidate</h3>
                <p className="mt-1 text-xs text-ink-secondary">
                  Select a rejection reason configured in Recruitment Settings.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-surface-neutral p-3 text-xs space-y-1.5 border border-divider">
              <div className="flex justify-between">
                <span className="text-ink-secondary">Candidate:</span>
                <span className="font-semibold text-ink-primary">{rejectingApplicant.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-secondary">Email:</span>
                <span className="font-medium text-ink-primary">{rejectingApplicant.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-secondary">Job Opening:</span>
                <span className="font-medium text-ink-primary">
                  {rejectingApplicant.job_opening?.title || (rejectingApplicant as any).job_opening_title || '—'}
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink-primary mb-1">
                  Rejection Reason <span className="text-error-main">*</span>
                </label>
                <Select
                  value={selectedRejectReason}
                  onChange={(e) => setSelectedRejectReason(e.target.value)}
                >
                  {configuredRejectReasons.map((r: any) => (
                    <option key={r.id} value={r.title}>
                      {r.title}
                    </option>
                  ))}
                </Select>
                {selectedRejectReason && (
                  <p className="mt-1 text-[11px] text-ink-secondary italic">
                    {configuredRejectReasons.find((r: any) => r.title === selectedRejectReason)?.description}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-primary mb-1">
                  Additional Notes <span className="text-ink-disabled font-normal">(optional)</span>
                </label>
                <Textarea
                  rows={2}
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="Additional context or interview feedback..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <Button variant="outlined" color="inherit" size="small"
                type="button"
                onClick={() => {
                  setRejectingApplicant(null);
                  setSelectedRejectReason('');
                  setRejectNotes('');
                }}
                disabled={changeStatus.isPending}
              >
                Cancel
              </Button>
              <Button size="small"
                type="button"
                onClick={handleConfirmReject}
                disabled={changeStatus.isPending}
              >
                {changeStatus.isPending ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-surface-paper border-t-transparent" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Confirm Rejection</span>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Applicant Card Component ────────────────────────────────────────────────

interface ApplicantCardProps {
  applicant: JobApplicant;
  currentStage: ApplicantStatus;
  availableStages: { key: ApplicantStatus; label: string }[];
  onMove: (id: string, status: ApplicantStatus) => void;
  onInitiateOnboarding: (applicant: JobApplicant) => void;
  onCancelOnboarding: (applicant: JobApplicant) => void;
  isMoving: boolean;
}

function ApplicantCard({
  applicant,
  currentStage,
  availableStages,
  onMove,
  onInitiateOnboarding,
  onCancelOnboarding,
  isMoving,
}: ApplicantCardProps) {
  const [showActions, setShowActions] = useState(false);

  // Helper to determine if a stage represents rejection
  const isRejectStage = (s: { key: string; label: string }) => {
    const k = (s.key || '').toLowerCase();
    const l = (s.label || '').toLowerCase();
    return k === 'rejected' || k.includes('reject') || l.includes('reject');
  };

  // Sequential progression stages in pipeline order (excluding rejection stages)
  const progressionStages = useMemo(() => {
    return availableStages.filter((s) => !isRejectStage(s));
  }, [availableStages]);

  // Find reject stage from configured stages, or fallback to default 'rejected'
  const rejectStage = useMemo(() => {
    return (
      availableStages.find((s) => isRejectStage(s)) || {
        key: 'rejected' as ApplicantStatus,
        label: 'Rejected',
      }
    );
  }, [availableStages]);

  // Current stage's index in the sequential progression pipeline
  const currentIndex = useMemo(() => {
    const cur = (currentStage || '').toLowerCase();
    let idx = progressionStages.findIndex(
      (s) => s.key.toLowerCase() === cur || s.label.toLowerCase() === cur
    );
    if (idx === -1 && applicant.stage) {
      idx = progressionStages.findIndex((s) => (s as any).id === applicant.stage);
    }
    return idx;
  }, [progressionStages, currentStage, applicant.stage]);

  // Target stages: Strictly the immediate next stage and the reject stage only
  const actionStages = useMemo(() => {
    const currentIsReject = isRejectStage({ key: currentStage, label: String(currentStage) });

    // If candidate is already in rejected status, allow reopening back to the initial stage (e.g. Applied)
    if (currentIsReject) {
      return progressionStages.length > 0 ? [progressionStages[0]] : [];
    }

    const targets: { key: ApplicantStatus; label: string; isReject?: boolean; isNext?: boolean }[] = [];

    // 1. Next Stage: strictly the single immediate sequential stage ahead
    if (currentIndex !== -1 && currentIndex + 1 < progressionStages.length) {
      targets.push({
        ...progressionStages[currentIndex + 1],
        isNext: true,
      });
    }

    // 2. Reject Stage: allow rejecting from any active progression stage
    if (rejectStage && rejectStage.key.toLowerCase() !== (currentStage || '').toLowerCase()) {
      targets.push({
        ...rejectStage,
        isReject: true,
      });
    }

    return targets;
  }, [currentStage, progressionStages, currentIndex, rejectStage]);

  return (
    <Card className="p-3 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-primary">{applicant.name}</p>
          <p className="truncate text-xs text-ink-secondary">{applicant.email}</p>
          {applicant.job_opening && (
            <p className="mt-0.5 truncate text-[11px] text-ink-disabled">{applicant.job_opening.title}</p>
          )}

          {/* Employee Referral Badge */}
          {applicant.referred_by_name && (
            <div className="mt-1.5 inline-flex items-center gap-1 rounded bg-warning-lighter px-1.5 py-0.5 text-[10px] font-semibold text-warning-dark border border-warning-light/80">
              <svg className="h-3 w-3 text-warning-main" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>Referred by {applicant.referred_by_name}</span>
            </div>
          )}
        </div>
        {applicant.rating !== null && (
          <div className="ml-2 flex items-center gap-0.5">
            <svg className="h-3.5 w-3.5 text-warning-light" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-xs text-ink-secondary">{applicant.rating}</span>
          </div>
        )}
      </div>

      {/* Selected Stage: Prominent Move to Onboarding Button */}
      {currentStage === 'selected' && (
        <div className="mt-2.5">
          <Button
            color="success"
            size="small"
            onClick={() => onInitiateOnboarding(applicant)}
            disabled={isMoving}
            title="Complete hiring and move to onboarding"
            startIcon={<Iconify icon="check" />}
            className="w-full"
          >
            Move to Onboarding
          </Button>
        </div>
      )}

      {/* Onboarded Stage: Guardrail Locked State & Explicit Revoke Offer Action */}
      {currentStage === 'onboarded' ? (
        <div className="mt-2.5 space-y-2">
          <div className="flex items-center justify-between rounded-md bg-success-lighter px-2 py-1 text-xs font-medium text-success-dark border border-success-light">
            <div className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5 text-success-main" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-semibold">Onboarded</span>
            </div>
            <span className="text-[10px] text-success-main font-mono">Employee Created</span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-divider">
            <div
              className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-disabled"
              title="Moving backwards is locked. Recruitment cycle completed."
            >
              <svg className="h-3.5 w-3.5 text-ink-disabled" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Locked</span>
            </div>

            <Button
              variant="soft"
              color="error"
              size="small"
              onClick={() => onCancelOnboarding(applicant)}
              disabled={isMoving}
              title="Revoke offer or cancel onboarding if candidate backs out"
              startIcon={<Iconify icon="close" />}
            >
              Revoke Offer
            </Button>
          </div>
        </div>
      ) : (
        /* Move Actions: Strictly only Next Stage and Reject Stage */
        <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-divider">
          <Button variant="text" size="small" onClick={() => setShowActions(!showActions)} disabled={isMoving}>
            {showActions ? 'Cancel' : 'Change stage...'}
          </Button>

          {showActions && (
            <div className="flex flex-wrap items-center gap-1.5">
              {actionStages.length === 0 ? (
                <span className="text-[11px] italic text-ink-disabled">No further stages</span>
              ) : (
                actionStages.map((stage) => {
                  const isRejectBtn = (stage as { isReject?: boolean }).isReject || isRejectStage(stage);
                  return (
                    <Button
                      key={stage.key}
                      variant="soft"
                      color={isRejectBtn ? 'error' : 'primary'}
                      size="small"
                      onClick={() => {
                        onMove(applicant.id, stage.key);
                        setShowActions(false);
                      }}
                      disabled={isMoving}
                      title={isRejectBtn ? `Reject ${applicant.name}` : `Advance to ${stage.label}`}
                      startIcon={<Iconify icon={isRejectBtn ? 'close' : 'arrow-right'} />}
                    >
                      {stage.label}
                    </Button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
