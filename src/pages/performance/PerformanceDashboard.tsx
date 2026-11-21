import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { usePerformanceData } from '@/hooks/usePerformance';

// ─── SVG Vector Icons matching template screenshot ─────────────────────────

/**
 * Empty state icon for Objectives:
 * Clipboard checklist with bullseye target and dart.
 */
function ObjectiveEmptyIcon({ className = 'w-24 h-24 text-gray-800' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Clipboard Body */}
      <rect x="20" y="24" width="46" height="58" rx="4" />
      {/* Clip top */}
      <path d="M34 24V19a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5" />
      <path d="M38 17a4 4 0 0 1 10 0" />
      {/* Checklist items */}
      <path d="M28 35l3 3 6-6" strokeWidth="2" />
      <line x1="41" y1="36" x2="56" y2="36" strokeWidth="2" />

      <path d="M28 47l3 3 6-6" strokeWidth="2" />
      <line x1="41" y1="48" x2="52" y2="48" strokeWidth="2" />

      <path d="M28 59l3 3 6-6" strokeWidth="2" />
      <line x1="41" y1="60" x2="48" y2="60" strokeWidth="2" />

      {/* Target Bullseye on bottom right */}
      <circle cx="70" cy="65" r="18" fill="white" strokeWidth="2.5" />
      <circle cx="70" cy="65" r="12" strokeWidth="2" />
      <circle cx="70" cy="65" r="6" strokeWidth="2" />
      <circle cx="70" cy="65" r="1.5" fill="currentColor" />
      {/* Arrow / Dart hitting target */}
      <path d="M84 51l-9 9" strokeWidth="2.5" />
      <path d="M81 49l4-1 1 4" strokeWidth="2" />
      <path d="M86 54l-2 2" strokeWidth="2" />
    </svg>
  );
}

/**
 * Empty state icon for Key Results:
 * Ascending vertical bars with an upward trending zigzag arrow.
 */
function KeyResultEmptyIcon({ className = 'w-24 h-24 text-gray-800' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Vertical bars */}
      <rect x="25" y="60" width="10" height="25" rx="1.5" />
      <rect x="40" y="50" width="10" height="35" rx="1.5" />
      <rect x="55" y="40" width="10" height="45" rx="1.5" />
      <rect x="70" y="30" width="10" height="55" rx="1.5" />

      {/* Upward zigzag trend arrow */}
      <path d="M20 54l18-18 16 12 24-22" strokeWidth="3" />
      <path d="M70 26h8v8" strokeWidth="3" />
    </svg>
  );
}

/**
 * Empty state icon for Feedbacks:
 * 3 rating faces (sad, neutral, happy) with hand pointer pointing at the center.
 */
function FeedbackEmptyIcon({ className = 'w-24 h-24 text-gray-800' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Sad Face */}
      <circle cx="28" cy="34" r="10" strokeWidth="2.4" />
      <circle cx="25" cy="32" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="31" cy="32" r="1.2" fill="currentColor" stroke="none" />
      <path d="M24 38a5 5 0 0 1 8 0" strokeWidth="1.8" />

      {/* Neutral Face */}
      <circle cx="50" cy="34" r="10" strokeWidth="2.4" />
      <circle cx="47" cy="32" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="53" cy="32" r="1.2" fill="currentColor" stroke="none" />
      <line x1="46" y1="38" x2="54" y2="38" strokeWidth="1.8" />

      {/* Happy Face */}
      <circle cx="72" cy="34" r="10" strokeWidth="2.4" />
      <circle cx="69" cy="32" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="75" cy="32" r="1.2" fill="currentColor" stroke="none" />
      <path d="M68 36a5 5 0 0 0 8 0" strokeWidth="1.8" />

      {/* Horizontal Bar */}
      <line x1="20" y1="52" x2="80" y2="52" strokeWidth="3" />

      {/* Hand pointing to middle face */}
      <path d="M47 62v-14a3 3 0 0 1 6 0v14" strokeWidth="2.2" />
      <path d="M41 62a3 3 0 0 1 6 0v2" strokeWidth="2" />
      <path d="M37 65a3 3 0 0 1 4-2" strokeWidth="2" />
      <path d="M53 62a3 3 0 0 1 6 1v4" strokeWidth="2" />
      <path d="M39 67v16h22V67" strokeWidth="2.2" />
      <line x1="43" y1="83" x2="57" y2="83" strokeWidth="2.2" />
    </svg>
  );
}

// ─── Status Colors ──────────────────────────────────────────────────────────

const OBJECTIVE_STATUS_COLORS: Record<string, string> = {
  completed: '#10b981',
  achieved: '#10b981',
  in_progress: '#3b82f6',
  not_started: '#f59e0b',
  cancelled: '#94a3b8',
  other: '#64748b',
};

export default function PerformanceDashboard() {
  const { goals, kras, feedbacks, isLoading } = usePerformanceData();

  // 1. Objectives Metric
  const totalObjectives = goals.length;

  // 2. Key Results Metric
  const totalKeyResults = kras.length;

  // 3. Feedbacks Metric
  const totalFeedbacks = feedbacks.length;

  // 4. Objectives At-Risk calculation
  const atRiskObjectives = useMemo(() => {
    const today = new Date();
    return goals.filter((g) => {
      const isCompleted =
        (g.status || '').toLowerCase() === 'completed' ||
        (g.status || '').toLowerCase() === 'achieved' ||
        (g.progress_percentage ?? 0) >= 100;
      if (isCompleted) return false;

      // Check if marked as at_risk
      if ((g.status || '').toLowerCase() === 'at_risk') return true;

      // Check overdue or close to end date with low progress
      if (g.end_date) {
        const endDate = new Date(g.end_date);
        if (endDate < today) return true;
        const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 7 && (g.progress_percentage ?? 0) < 50) return true;
      }
      return false;
    });
  }, [goals]);

  const atRiskCount = atRiskObjectives.length;

  // Objective Status Breakdown for populated state
  const objectiveStatusData = useMemo(() => {
    const counts: Record<string, number> = {
      completed: 0,
      in_progress: 0,
      not_started: 0,
      cancelled: 0,
    };

    goals.forEach((g) => {
      const st = (g.status || '').toLowerCase();
      if (st === 'completed' || st === 'achieved') counts.completed++;
      else if (st === 'in_progress') counts.in_progress++;
      else if (st === 'cancelled') counts.cancelled++;
      else counts.not_started++;
    });

    return [
      { name: 'Completed', value: counts.completed, color: OBJECTIVE_STATUS_COLORS.completed },
      { name: 'In Progress', value: counts.in_progress, color: OBJECTIVE_STATUS_COLORS.in_progress },
      { name: 'Not Started', value: counts.not_started, color: OBJECTIVE_STATUS_COLORS.not_started },
      { name: 'Cancelled', value: counts.cancelled, color: OBJECTIVE_STATUS_COLORS.cancelled },
    ].filter((item) => item.value > 0);
  }, [goals]);

  // Key Result Breakdown for populated state
  const kraStatusData = useMemo(() => {
    const active = kras.filter((k) => k.is_active).length;
    const inactive = kras.length - active;
    return [
      { name: 'Active', value: active, color: '#10b981' },
      { name: 'Inactive', value: inactive, color: '#94a3b8' },
    ].filter((item) => item.value > 0);
  }, [kras]);

  // Feedback Rating Breakdown for populated state
  const feedbackRatingData = useMemo(() => {
    const ratings: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    feedbacks.forEach((f) => {
      const r = Math.min(5, Math.max(1, Math.round(Number(f.overall_rating) || 3)));
      ratings[r] = (ratings[r] || 0) + 1;
    });

    return [
      { rating: '5 ★', count: ratings[5], color: '#10b981' },
      { rating: '4 ★', count: ratings[4], color: '#3b82f6' },
      { rating: '3 ★', count: ratings[3], color: '#f59e0b' },
      { rating: '2 ★', count: ratings[2], color: '#f97316' },
      { rating: '1 ★', count: ratings[1], color: '#ef4444' },
    ];
  }, [feedbacks]);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-8 font-sans">
      {/* ─── Breadcrumb ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 font-medium">
        <span>DigiHRMS</span>
        <span>&gt;</span>
        <span>pms</span>
        <span>&gt;</span>
        <span className="text-gray-900 font-semibold">dashboard-view</span>
      </div>

      {/* ─── Top Metrics Row (4 Cards) ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Card 1: Total employee objectives */}
        <Link
          to="/goals"
          className="group block bg-white rounded-lg shadow-sm border border-gray-100 border-t-4 border-t-[#10b981] p-5 hover:shadow-md transition-shadow"
        >
          <div className="text-sm font-semibold text-gray-800">Total employee objectives</div>
          <div className="mt-4 text-4xl font-bold text-gray-900 group-hover:text-[#10b981] transition-colors">
            {isLoading ? <span className="text-2xl text-gray-400">...</span> : totalObjectives}
          </div>
        </Link>

        {/* Card 2: Total key results */}
        <Link
          to="/kras"
          className="group block bg-white rounded-lg shadow-sm border border-gray-100 border-t-4 border-t-[#64748b] p-5 hover:shadow-md transition-shadow"
        >
          <div className="text-sm font-semibold text-gray-800">Total key results</div>
          <div className="mt-4 text-4xl font-bold text-gray-900 group-hover:text-[#64748b] transition-colors">
            {isLoading ? <span className="text-2xl text-gray-400">...</span> : totalKeyResults}
          </div>
        </Link>

        {/* Card 3: Total feedbacks */}
        <Link
          to="/performance-feedback"
          className="group block bg-white rounded-lg shadow-sm border border-gray-100 border-t-4 border-t-[#ef4444] p-5 hover:shadow-md transition-shadow"
        >
          <div className="text-sm font-semibold text-gray-800">Total feedbacks</div>
          <div className="mt-4 text-4xl font-bold text-gray-900 group-hover:text-[#ef4444] transition-colors">
            {isLoading ? <span className="text-2xl text-gray-400">...</span> : totalFeedbacks}
          </div>
        </Link>

        {/* Card 4: Objectives At-Risk */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
          <div className="text-sm font-semibold text-gray-800">Objectives At-Risk</div>
          <div className="mt-4">
            {atRiskCount === 0 ? (
              <div className="text-sm text-gray-600 font-normal">
                No OKRs are currently At-Risk.
              </div>
            ) : (
              <div>
                <div className="text-3xl font-bold text-amber-600">{atRiskCount}</div>
                <div className="text-xs text-amber-700 mt-1">OKRs require immediate attention</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Middle Row (2 Cards: Objective status & Key result status) ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Widget 1: Objective status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <h2 className="text-sm md:text-base font-semibold text-gray-900">Objective status</h2>
            <Link
              to="/goals"
              title="View Objectives"
              className="text-gray-900 hover:text-emerald-600 transition-colors text-xs font-bold"
            >
              ▶
            </Link>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center min-h-[340px] py-6">
            {totalObjectives === 0 ? (
              <div className="flex flex-col items-center justify-center text-center">
                <ObjectiveEmptyIcon className="w-24 h-24 text-gray-800" />
                <p className="mt-4 text-sm text-gray-600 font-normal">
                  No objectives are available.
                </p>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center">
                <div className="w-full h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={objectiveStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {objectiveStatusData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-4 mt-2">
                  {objectiveStatusData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 text-xs text-gray-700">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>
                        {item.name}: <strong className="text-gray-900">{item.value}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Widget 2: Key result status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <h2 className="text-sm md:text-base font-semibold text-gray-900">Key result status</h2>
            <Link
              to="/kras"
              title="View Key Results"
              className="text-gray-900 hover:text-slate-700 transition-colors text-xs font-bold"
            >
              ▶
            </Link>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center min-h-[340px] py-6">
            {totalKeyResults === 0 ? (
              <div className="flex flex-col items-center justify-center text-center">
                <KeyResultEmptyIcon className="w-24 h-24 text-gray-800" />
                <p className="mt-4 text-sm text-gray-600 font-normal">
                  No key results are available.
                </p>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center">
                <div className="w-full h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={kraStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {kraStatusData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-4 mt-2">
                  {kraStatusData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 text-xs text-gray-700">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>
                        {item.name}: <strong className="text-gray-900">{item.value}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Lower Row (Widget 3: Feedback status) ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <h2 className="text-sm md:text-base font-semibold text-gray-900">Feedback status</h2>
            <Link
              to="/performance-feedback"
              title="View Feedbacks"
              className="text-gray-900 hover:text-red-600 transition-colors text-xs font-bold"
            >
              ▶
            </Link>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] py-6">
            {totalFeedbacks === 0 ? (
              <div className="flex flex-col items-center justify-center text-center">
                <FeedbackEmptyIcon className="w-24 h-24 text-gray-800" />
                <p className="mt-4 text-sm text-gray-600 font-normal">
                  No feedbacks are available.
                </p>
              </div>
            ) : (
              <div className="w-full">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={feedbackRatingData}>
                      <XAxis dataKey="rating" stroke="#6b7280" fontSize={12} />
                      <YAxis allowDecimals={false} stroke="#6b7280" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center text-xs text-gray-500 mt-2">
                  Total Reviews: <strong className="text-gray-900">{totalFeedbacks}</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Floating Action Button (+) ────────────────────────────────────── */}
      <Link
        to="/goals"
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#ef4444] text-white shadow-lg hover:bg-red-600 hover:scale-105 transition-all"
        title="Add Objective / Goal"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </Link>
    </div>
  );
}
