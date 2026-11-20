/**
 * ApplicantDetailDrawer — Right-Side Slide-Over Detail Drawer for Candidates
 *
 * Displays full candidate application details:
 * - Candidate Header (Avatar initials, Full Name, Applied Job Opening, Current Stage, Rating, Referral)
 * - Visual Recruitment Pipeline Journey
 * - Contact & Application Information (Email with copy, Phone with copy, Applied Date, Rating, Referral)
 * - Resume / CV Document card with "View Resume" action
 * - Notes & Cover Letter with inline edit/save
 * - Application Actions (Move to Screening & Reject) at the bottom for "applied" candidates
 * - Candidates with other statuses display their information only
 */

import { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { jobApplicantsCrudConfig } from '@/config/crud/jobApplicants';
import { recruitmentWorkflow } from '@/config/workflows/recruitment';
import { StatusBadge } from '@/components/WorkflowEngine/StatusBadge';
import { useRecruitmentStages } from '@/hooks/useRecruitment';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';

export interface ApplicantRow {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  job_opening?: { id: string; title: string } | string;
  job_opening_title?: string;
  job_opening_id?: string;
  stage?: string;
  stage_name?: string;
  stage_color?: string;
  resume_url?: string;
  rating?: number | null;
  notes?: string;
  referred_by_name?: string | null;
  is_referral?: boolean;
  applied_date?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

interface ApplicantDetailDrawerProps {
  applicant: ApplicantRow;
  onClose: () => void;
  onApplicantUpdated?: (applicant: ApplicantRow) => void;
}

export function ApplicantDetailDrawer({ applicant, onClose, onApplicantUpdated }: ApplicantDetailDrawerProps) {
  const queryClient = useQueryClient();

  const [isAdvancing, setIsAdvancing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Notes state
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(applicant.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Sync notes draft when applicant changes
  useEffect(() => {
    setNotesDraft(applicant.notes || '');
    setIsEditingNotes(false);
  }, [applicant.id, applicant.notes]);

  // Check if candidate is currently in "applied" status
  const isApplied = (applicant.status || '').trim().toLowerCase() === 'applied';

  // Extract Job Opening ID
  const jobOpeningId = useMemo(() => {
    if (!applicant) return undefined;
    const jo = applicant.job_opening;
    if (jo && typeof jo === 'object' && 'id' in jo) {
      return String(jo.id);
    }
    if (typeof jo === 'string' && jo.trim()) {
      return jo.trim();
    }
    if (typeof applicant.job_opening_id === 'string' && applicant.job_opening_id.trim()) {
      return applicant.job_opening_id.trim();
    }
    return undefined;
  }, [applicant]);

  // Extract Job Title
  const jobTitle = useMemo(() => {
    if (!applicant) return 'Not specified';
    const jo = applicant.job_opening;
    if (jo && typeof jo === 'object' && 'title' in jo) {
      return String(jo.title);
    }
    if (typeof applicant.job_opening_title === 'string' && applicant.job_opening_title.trim()) {
      return applicant.job_opening_title.trim();
    }
    if (typeof jo === 'string' && jo.trim()) {
      return jo.trim();
    }
    return 'Not specified';
  }, [applicant]);

  // Fetch recruitment stages for this candidate's specific job opening
  const { data: rawStages = [] } = useRecruitmentStages(
    jobOpeningId ? { job_opening: jobOpeningId, fallback: true } : { fallback: true }
  );

  // Sort stages and supply fallback if none configured
  const stages = useMemo(() => {
    if (rawStages && rawStages.length > 0) {
      return [...rawStages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    return [
      { id: 'stage-applied', name: 'Applied', slug: 'applied', color: 'blue', order: 0 },
      { id: 'stage-screening', name: 'Screening', slug: 'screening', color: 'indigo', order: 1 },
      { id: 'stage-interview', name: 'Interview', slug: 'interview', color: 'purple', order: 2 },
      { id: 'stage-selected', name: 'Selected', slug: 'selected', color: 'emerald', order: 3 },
      { id: 'stage-onboarded', name: 'Onboarding', slug: 'onboarded', color: 'cyan', order: 4 },
    ];
  }, [rawStages]);

  // Find the screening stage specifically for advancing from "applied"
  const screeningStage = useMemo(() => {
    return (
      stages.find((s) => s.slug?.toLowerCase() === 'screening') ||
      stages.find((s) => s.name?.toLowerCase().includes('screen')) ||
      (stages.length > 1 && stages[0]?.slug === 'applied' ? stages[1] : null) ||
      { id: 'stage-screening', name: 'Screening', slug: 'screening', color: 'indigo', order: 1 }
    );
  }, [stages]);

  // Determine candidate's current stage index in this opening's pipeline
  const currentStageIndex = useMemo(() => {
    if (!stages.length) return -1;

    // 1. Match by exact stage UUID
    if (applicant.stage) {
      const idx = stages.findIndex((s) => s.id === applicant.stage);
      if (idx !== -1) return idx;
    }
    // 2. Match by status slug
    if (applicant.status) {
      const statusSlug = applicant.status.toLowerCase().replace(/\s+/g, '-');
      const idx = stages.findIndex((s) => s.slug.toLowerCase() === statusSlug);
      if (idx !== -1) return idx;
    }
    // 3. Match by stage_name
    if (applicant.stage_name) {
      const idx = stages.findIndex((s) => s.name.toLowerCase() === applicant.stage_name?.toLowerCase());
      if (idx !== -1) return idx;
    }
    // 4. Match by status string to name
    if (applicant.status) {
      const idx = stages.findIndex((s) => s.name.toLowerCase() === applicant.status.toLowerCase());
      if (idx !== -1) return idx;
    }
    return -1;
  }, [stages, applicant.stage, applicant.status, applicant.stage_name]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle advancing applied candidate to Screening
  const handleMoveToScreening = async () => {
    if (isAdvancing) return;
    setIsAdvancing(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const payload: { status: string; stage?: string } = { status: 'screening' };
      if (screeningStage?.id && !screeningStage.id.startsWith('stage-')) {
        payload.stage = screeningStage.id;
      }

      const res = await api.patch(`/api/v1/recruitment/applicants/${applicant.id}/change-status/`, payload);

      queryClient.invalidateQueries({ queryKey: [jobApplicantsCrudConfig.queryKey] });
      queryClient.invalidateQueries({ queryKey: ['recruitment-stages'] });
      queryClient.invalidateQueries({ queryKey: ['job-openings'] });

      setActionSuccess('Candidate successfully moved to Screening!');
      setTimeout(() => setActionSuccess(null), 3500);

      if (res.data) {
        onApplicantUpdated?.(res.data);
      } else {
        onApplicantUpdated?.({
          ...applicant,
          stage: payload.stage || applicant.stage,
          stage_name: screeningStage.name,
          status: 'screening',
        });
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string; detail?: string } }; message?: string };
      const msg =
        errorObj.response?.data?.error ||
        errorObj.response?.data?.detail ||
        errorObj.message ||
        'Failed to move candidate to screening.';
      setActionError(typeof msg === 'object' ? JSON.stringify(msg) : String(msg));
    } finally {
      setIsAdvancing(false);
    }
  };

  // Handle Rejecting Candidate
  const handleReject = async () => {
    if (isAdvancing) return;
    if (!window.confirm(`Are you sure you want to mark ${applicant.name} as Rejected?`)) return;

    setIsAdvancing(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await api.patch(`/api/v1/recruitment/applicants/${applicant.id}/change-status/`, {
        status: 'rejected',
      });
      queryClient.invalidateQueries({ queryKey: [jobApplicantsCrudConfig.queryKey] });

      setActionSuccess('Candidate has been marked as Rejected.');
      setTimeout(() => setActionSuccess(null), 3500);

      if (res.data) {
        onApplicantUpdated?.(res.data);
      } else {
        onApplicantUpdated?.({ ...applicant, status: 'rejected' });
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: string } }; message?: string };
      setActionError(errorObj.response?.data?.error || 'Failed to reject applicant.');
    } finally {
      setIsAdvancing(false);
    }
  };

  // Handle saving notes
  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    setActionError(null);
    try {
      const res = await api.patch(`/api/v1/recruitment/applicants/${applicant.id}/`, {
        notes: notesDraft,
      });
      queryClient.invalidateQueries({ queryKey: [jobApplicantsCrudConfig.queryKey] });
      setIsEditingNotes(false);
      setActionSuccess('Notes updated successfully.');
      setTimeout(() => setActionSuccess(null), 3000);

      if (res.data) {
        onApplicantUpdated?.(res.data);
      } else {
        onApplicantUpdated?.({ ...applicant, notes: notesDraft });
      }
    } catch {
      setActionError('Failed to save notes.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Copy to clipboard helper
  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Get initials for avatar
  const initials = useMemo(() => {
    if (!applicant.name) return 'CA';
    const parts = applicant.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return applicant.name.slice(0, 2).toUpperCase();
  }, [applicant.name]);

  // Formatted applied date
  const formattedAppliedDate = useMemo(() => {
    const rawDate = applicant.applied_date || applicant.created_at;
    if (!rawDate) return '—';
    try {
      return new Date(rawDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return String(rawDate);
    }
  }, [applicant.applied_date, applicant.created_at]);

  return (
    <>
      {/* Semi-transparent backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Right Side Drawer */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[520px] lg:w-[600px] bg-surface-paper shadow-2xl flex flex-col h-full border-l border-divider animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
        aria-label={`Applicant details for ${applicant.name}`}
      >
        {/* Drawer Header (Clean - No action buttons up here) */}
        <div className="relative border-b border-divider bg-gradient-to-r from-grey-50 to-primary-lighter/30 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full p-1.5 text-ink-disabled hover:bg-grey-200 hover:text-ink-primary transition-colors cursor-pointer"
            aria-label="Close drawer"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-start gap-4 pr-8">
            <div className="h-14 w-14 flex-shrink-0 rounded-full bg-gradient-to-br from-primary-main to-indigo-700 text-white font-bold text-lg flex items-center justify-center shadow-md ring-4 ring-white">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-ink-primary truncate">{applicant.name}</h2>
              <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-primary-dark truncate">
                <svg className="w-4 h-4 flex-shrink-0 text-primary-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>{jobTitle}</span>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <StatusBadge status={applicant.status} config={recruitmentWorkflow} />
                {applicant.stage_name && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-lighter text-primary-dark border border-primary-light">
                    Stage: {applicant.stage_name}
                  </span>
                )}
                {applicant.is_referral && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                    ★ Referred by {applicant.referred_by_name || 'Staff'}
                  </span>
                )}
                {applicant.rating !== undefined && applicant.rating !== null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-800 border border-yellow-200">
                    <span className="text-yellow-500">★</span> {applicant.rating} / 5.0
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body with All Application Details */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Visual Recruitment Stage Stepper (Read-only journey) */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary mb-3">
              Recruitment Pipeline Journey
            </h3>
            <div className="relative flex flex-col gap-2">
              {stages.map((stageItem, idx) => {
                const isPassed = currentStageIndex !== -1 && idx < currentStageIndex;
                const isCurrent =
                  idx === currentStageIndex ||
                  (!applicant.stage && applicant.status?.toLowerCase() === stageItem.slug?.toLowerCase()) ||
                  (applicant.status?.toLowerCase() === stageItem.slug?.toLowerCase());

                return (
                  <div
                    key={stageItem.id || stageItem.slug}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                      isCurrent
                        ? 'border-primary-main bg-primary-lighter/70 shadow-xs'
                        : isPassed
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : 'border-divider bg-surface-neutral/50'
                    }`}
                  >
                    <div
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isCurrent
                          ? 'bg-primary-main text-white ring-2 ring-primary-light'
                          : isPassed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-grey-200 text-ink-secondary'
                      }`}
                    >
                      {isPassed ? '✓' : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${isCurrent ? 'text-primary-darker font-semibold' : 'text-ink-primary'}`}>
                          {stageItem.name}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] uppercase font-bold text-primary-dark bg-primary-lighter px-2 py-0.5 rounded-full">
                            Current Stage
                          </span>
                        )}
                        {isPassed && (
                          <span className="text-[10px] font-semibold text-emerald-700">
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contact & Application Information Grid */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary mb-3">
              Contact & Application Info
            </h3>
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-divider bg-surface-neutral/50 p-4">
              {/* Email */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-ink-secondary min-w-0">
                  <svg className="w-4 h-4 text-ink-disabled flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href={`mailto:${applicant.email}`} className="text-primary-main hover:underline truncate">
                    {applicant.email}
                  </a>
                </div>
                <Button variant="outlined" color="inherit" size="small"
                  type="button"
                  onClick={() => handleCopy(applicant.email, 'email')}
                >
                  {copiedField === 'email' ? 'Copied!' : 'Copy'}
                </Button>
              </div>

              {/* Phone */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-ink-secondary min-w-0">
                  <svg className="w-4 h-4 text-ink-disabled flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {applicant.phone ? (
                    <a href={`tel:${applicant.phone}`} className="text-ink-primary hover:underline truncate">
                      {applicant.phone}
                    </a>
                  ) : (
                    <span className="text-ink-disabled">Phone not provided</span>
                  )}
                </div>
                {applicant.phone && (
                  <Button variant="outlined" color="inherit" size="small"
                    type="button"
                    onClick={() => handleCopy(applicant.phone || '', 'phone')}
                  >
                    {copiedField === 'phone' ? 'Copied!' : 'Copy'}
                  </Button>
                )}
              </div>

              {/* Applied Date */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-ink-secondary">
                  <svg className="w-4 h-4 text-ink-disabled flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Applied Date:</span>
                </div>
                <span className="text-sm font-semibold text-ink-primary">{formattedAppliedDate}</span>
              </div>

              {/* Rating */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-ink-secondary">
                  <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span>Candidate Rating:</span>
                </div>
                <span className="text-sm font-semibold text-ink-primary">
                  {applicant.rating !== undefined && applicant.rating !== null ? `${applicant.rating} / 5.0` : 'Not rated yet'}
                </span>
              </div>

              {/* Referral Details */}
              {applicant.is_referral && (
                <div className="flex items-center justify-between border-t border-divider pt-2">
                  <div className="flex items-center gap-2 text-sm text-amber-700">
                    <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span>Referred By:</span>
                  </div>
                  <span className="text-sm font-bold text-amber-800">
                    {applicant.referred_by_name || 'Internal Employee'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Resume / CV Document */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary mb-3">
              Resume / Curriculum Vitae
            </h3>
            {applicant.resume_url ? (
              <div className="rounded-xl border border-divider bg-surface-paper p-4 shadow-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-primary-lighter text-primary-dark flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-primary truncate">Candidate_Resume.pdf</p>
                    <p className="text-xs text-ink-secondary truncate max-w-xs">{applicant.resume_url}</p>
                  </div>
                </div>

                <a
                  href={applicant.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-primary-main hover:bg-primary-dark transition-colors shadow-sm flex-shrink-0"
                >
                  <span>View Resume</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-divider bg-surface-neutral/50 p-4 text-center">
                <p className="text-sm text-ink-secondary">No resume document attached to this application.</p>
              </div>
            )}
          </div>

          {/* Notes / Cover Letter Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                Application Notes & Cover Letter
              </h3>
              {!isEditingNotes && (
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(true)}
                  className="text-xs font-semibold text-primary-main hover:text-primary-dark cursor-pointer"
                >
                  {applicant.notes ? 'Edit Notes' : '+ Add Notes'}
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <div className="space-y-2">
                <Textarea
                  rows={4}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Enter candidate application notes or interview feedback..."
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNotesDraft(applicant.notes || '');
                      setIsEditingNotes(false);
                    }}
                    className="px-3 py-1.5 rounded-md text-xs font-medium text-ink-secondary hover:bg-surface-neutral cursor-pointer"
                  >
                    Cancel
                  </button>
                  <Button size="small"
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                  >
                    {isSavingNotes ? 'Saving...' : 'Save Notes'}
                  </Button>
                </div>
              </div>
            ) : applicant.notes ? (
              <div className="rounded-xl border border-divider bg-surface-neutral/50 p-4 text-sm text-ink-primary whitespace-pre-wrap leading-relaxed">
                {applicant.notes}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-divider bg-surface-neutral/30 p-4 text-center">
                <p className="text-sm text-ink-disabled">No notes or cover letter provided by the candidate.</p>
              </div>
            )}
          </div>

          {/* Application Actions (Placed below all details as requested) */}
          {isApplied && (
            <div className="rounded-xl border border-primary-light bg-primary-lighter/60 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary-darker">
                  Application Actions
                </span>
                <span className="text-xs text-primary-dark font-medium bg-primary-lighter px-2.5 py-0.5 rounded-full">
                  Status: Applied
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Move to Screening Button */}
                <Button
                  type="button"
                  onClick={handleMoveToScreening}
                  disabled={isAdvancing}
                  className="flex-1"
                >
                  {isAdvancing ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Moving to Screening...</span>
                    </>
                  ) : (
                    <>
                      <span>Move to Screening</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </Button>

                {/* Reject Button */}
                <Button variant="outlined" color="inherit"
                  type="button"
                  onClick={handleReject}
                  disabled={isAdvancing}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Reject</span>
                </Button>
              </div>

              {actionSuccess && (
                <div className="mt-3 text-xs font-semibold text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200 flex items-center gap-1.5 animate-in fade-in">
                  <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{actionSuccess}</span>
                </div>
              )}
              {actionError && (
                <div className="mt-3 text-xs font-semibold text-red-700 bg-red-50 p-2 rounded border border-red-200 flex items-center gap-1.5 animate-in fade-in">
                  <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{actionError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="border-t border-divider bg-surface-neutral px-6 py-3 flex items-center justify-between text-xs text-ink-secondary">
          <span>
            Applicant ID: <span className="font-mono">{applicant.id ? `${applicant.id.slice(0, 8)}...` : '—'}</span>
          </span>
          <Button variant="outlined" color="inherit" size="small"
            type="button"
            onClick={onClose}
          >
            Close Panel
          </Button>
        </div>
      </div>
    </>
  );
}

