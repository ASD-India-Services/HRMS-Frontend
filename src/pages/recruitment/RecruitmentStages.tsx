/**
 * RecruitmentStages — Configuration page for hiring pipeline stages.
 *
 * Allows HR administrators to:
 * - View all configured hiring stages with sequence order and candidate counts
 * - Create new custom stages (Name, Slug, Theme Color, Order)
 * - Edit existing stage names, theme colors, and order
 * - Reorder stages with fast sequence controls (Up / Down)
 * - Delete custom stages with validation preventing deletion if active candidates exist
 */

import { useState, useMemo } from 'react';
import {
  useRecruitmentStages,
  useCreateRecruitmentStage,
  useUpdateRecruitmentStage,
  useDeleteRecruitmentStage,
  useReorderRecruitmentStages,
  useApplicants,
} from '@/hooks/useRecruitment';
import type { RecruitmentStage } from '@/types/recruitment';
import { Link } from 'react-router-dom';

export const STAGE_COLOR_PRESETS: { key: string; label: string; bg: string; dot: string; badge: string; border: string; previewClass: string }[] = [
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

export function RecruitmentStages() {
  const { data: stages = [], isLoading, isError, error } = useRecruitmentStages();
  const { data: applicantsData } = useApplicants({ page_size: 500 });

  const createMutation = useCreateRecruitmentStage();
  const updateMutation = useUpdateRecruitmentStage();
  const deleteMutation = useDeleteRecruitmentStage();
  const reorderMutation = useReorderRecruitmentStages();

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

  // Sort stages by order
  const sortedStages = useMemo(() => {
    return [...stages].sort((a, b) => a.order - b.order);
  }, [stages]);

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
      if (editingStage) {
        await updateMutation.mutateAsync({
          id: editingStage.id,
          data: {
            name: formName.trim(),
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

    // Assign consecutive orders 1, 2, 3...
    const payload = reordered.map((stage, i) => ({
      id: stage.id,
      order: i + 1,
    }));

    try {
      await reorderMutation.mutateAsync(payload);
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

  const selectedPreset = getStagePreset(formColor);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Top Banner & Header */}
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

      {/* Pipeline Visual Stepper Preview */}
      <div className="mb-8 rounded-2xl border border-gray-200/80 bg-gradient-to-b from-white to-gray-50/50 p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Pipeline Sequence Preview ({sortedStages.length} Stages)
          </h2>
          <span className="text-xs text-gray-400">Order from left to right</span>
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

      {/* Loading & Error States */}
      {isLoading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-r-transparent"></div>
          <p className="mt-3 text-sm font-medium text-gray-500">Loading recruitment stages...</p>
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800 shadow-sm">
          <p className="font-semibold">Unable to load recruitment stages</p>
          <p className="mt-1 text-sm text-rose-600">
            {(error as any)?.message || 'Please check your connection and try again.'}
          </p>
        </div>
      )}

      {/* Main Stages Cards / Table */}
      {!isLoading && !isError && (
        <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50/75 px-6 py-3.5">
            <div className="grid grid-cols-12 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <div className="col-span-1">Order</div>
              <div className="col-span-4">Stage Name</div>
              <div className="col-span-2">Color Theme</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-1 text-center">Applicants</div>
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
                  <div className="col-span-4 flex items-center gap-3">
                    <span className={`h-3 w-3 shrink-0 rounded-full ${preset.dot}`} />
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{stage.name}</h3>
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
                  <div className="col-span-2">
                    {stage.is_system ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        <svg className="h-3 w-3 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                        System Default
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                        <svg className="h-3 w-3 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63" />
                        </svg>
                        Custom Stage
                      </span>
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

      {/* Add / Edit Stage Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl transition-all">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {editingStage ? `Edit Stage: ${editingStage.name}` : 'Configure New Recruitment Stage'}
              </h2>
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
                  placeholder="e.g. Technical Assessment, HR Interview..."
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (!editingStage) {
                      setFormSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/(^-|-$)+/g, '')
                      );
                    }
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
                  disabled={!!editingStage}
                  placeholder="e.g. technical-assessment"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-gray-50/80 px-3.5 py-2.5 font-mono text-xs text-gray-700 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-75"
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
                      className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition ${formColor === preset.key
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
                      <span className="text-[10px] font-medium text-gray-600 truncate w-full">{preset.label.split(' ')[0]}</span>
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
                  ⚠️ Note: There are currently {getStageApplicantCount(deleteStageTarget)} applicant(s) in this stage. You must move them to another stage before deleting.
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
