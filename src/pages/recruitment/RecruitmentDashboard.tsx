import React from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useJobOpenings, useApplicants, useInterviews } from '@/hooks/useRecruitment';

const STAGE_COLORS: Record<string, string> = {
  Applied: 'rgb(var(--info-main))',
  Screening: 'rgb(var(--secondary-main))',
  Interview: 'rgb(var(--warning-main))',
  Selected: 'rgb(var(--success-main))',
  Hired: 'rgb(var(--success-dark))',
  Rejected: 'rgb(var(--error-main))',
  Other: 'rgb(var(--grey-500))',
};

const DEPT_COLORS = ['rgb(var(--info-main))', 'rgb(var(--success-main))', 'rgb(var(--warning-main))', 'rgb(var(--secondary-main))', 'rgb(var(--error-light))', 'rgb(var(--primary-main))', 'rgb(var(--warning-dark))'];

export default function RecruitmentDashboard() {
  const { data: openingsData, isLoading: openingsLoading } = useJobOpenings({ page: 1, page_size: 100 });
  const { data: applicantsData, isLoading: applicantsLoading } = useApplicants({ page: 1, page_size: 100 });
  const { data: interviewsData, isLoading: interviewsLoading } = useInterviews({ page: 1, page_size: 100 });

  const openings = openingsData?.results ?? [];
  const applicants = applicantsData?.results ?? [];
  const interviews = interviewsData?.results ?? [];

  // Key Metrics
  const totalOpenings = openingsData?.count ?? openings.length;
  const activeOpenings = openings.filter((o) => o.status === 'open').length;
  const totalApplicants = applicantsData?.count ?? applicants.length;
  const inEvaluation = applicants.filter((a) =>
    ['screening', 'interview'].includes((a.status || '').toLowerCase())
  ).length;
  const hiredCount = applicants.filter((a) =>
    ['selected', 'hired', 'onboarded'].includes((a.status || '').toLowerCase())
  ).length;

  // Pipeline stage chart data
  const stageCounts: Record<string, number> = {
    Applied: 0,
    Screening: 0,
    Interview: 0,
    Selected: 0,
    Hired: 0,
    Rejected: 0,
  };

  applicants.forEach((app) => {
    const s = (app.status || '').toLowerCase();
    if (s === 'applied') stageCounts.Applied++;
    else if (s === 'screening') stageCounts.Screening++;
    else if (s === 'interview') stageCounts.Interview++;
    else if (s === 'selected') stageCounts.Selected++;
    else if (s === 'hired' || s === 'onboarded') stageCounts.Hired++;
    else if (s === 'rejected') stageCounts.Rejected++;
    else stageCounts.Applied++;
  });

  const pipelineChartData = Object.entries(stageCounts).map(([label, value]) => ({
    label,
    count: value,
    fill: STAGE_COLORS[label] || 'rgb(var(--info-main))',
  }));

  // Department distribution of open positions
  const deptCounts: Record<string, number> = {};
  openings.forEach((job) => {
    const dept = job.department_name || job.department || 'General';
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });

  const deptChartData = Object.entries(deptCounts).map(([name, value]) => ({
    name,
    value,
  }));

  // Recent applicants (latest 5)
  const recentApplicants = [...applicants].slice(0, 5);

  // Upcoming interviews
  const upcomingInterviews = [...interviews].slice(0, 5);

  const isLoading = openingsLoading || applicantsLoading || interviewsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">Recruitment Dashboard</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Real-time hiring metrics, applicant pipeline progression, and recruitment analytics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/recruitment/job-openings"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md border border-divider bg-surface-paper text-ink-primary hover:bg-surface-neutral shadow-sm transition-colors"
          >
            <svg className="w-4 h-4 text-ink-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Job Openings
          </Link>
          <Link
            to="/recruitment/pipeline"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md text-primary-contrast bg-primary-main hover:bg-primary-dark shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
            </svg>
            Open Pipeline
          </Link>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Openings */}
        <div className="rounded-xl border border-divider bg-surface-paper p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
              Active Positions
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-lighter text-primary-main">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-ink-primary">
              {isLoading ? '...' : activeOpenings}
            </span>
            <span className="ml-2 text-xs text-ink-secondary">of {totalOpenings} total</span>
          </div>
          <div className="mt-2 text-xs text-primary-main font-medium">
            <Link to="/recruitment/job-openings" className="hover:underline">View all openings →</Link>
          </div>
        </div>

        {/* Total Candidates */}
        <div className="rounded-xl border border-divider bg-surface-paper p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
              Total Candidates
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-lighter text-secondary-main">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-ink-primary">
              {isLoading ? '...' : totalApplicants}
            </span>
            <span className="ml-2 text-xs text-ink-secondary">applicants received</span>
          </div>
          <div className="mt-2 text-xs text-secondary-main font-medium">
            <Link to="/recruitment/pipeline" className="hover:underline">View pipeline →</Link>
          </div>
        </div>

        {/* In Evaluation */}
        <div className="rounded-xl border border-divider bg-surface-paper p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
              In Evaluation
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-lighter text-warning-main">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-ink-primary">
              {isLoading ? '...' : inEvaluation}
            </span>
            <span className="ml-2 text-xs text-ink-secondary">screening / interview</span>
          </div>
          <div className="mt-2 text-xs text-warning-main font-medium">
            <span>Active hiring rounds</span>
          </div>
        </div>

        {/* Hired */}
        <div className="rounded-xl border border-divider bg-surface-paper p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
              Hired / Selected
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-lighter text-success-main">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-ink-primary">
              {isLoading ? '...' : hiredCount}
            </span>
            <span className="ml-2 text-xs text-success-main font-semibold">Offer Accepted</span>
          </div>
          <div className="mt-2 text-xs text-success-dark font-medium">
            <span>Successful candidates</span>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pipeline Stage Funnel Chart */}
        <div className="rounded-xl border border-divider bg-surface-paper p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-ink-primary">Applicant Pipeline Stages</h2>
              <p className="text-xs text-ink-secondary">Candidate distribution across active recruitment stages</p>
            </div>
            <Link to="/recruitment/stages" className="text-xs font-medium text-primary-main hover:underline">
              Stages Setup →
            </Link>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(var(--grey-200))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: unknown) => [typeof val === 'number' ? val : 0, 'Applicants']}
                  contentStyle={{ backgroundColor: 'rgb(var(--surface-paper))', borderRadius: '8px', border: '1px solid rgb(var(--grey-300))' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {pipelineChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Positions by Department */}
        <div className="rounded-xl border border-divider bg-surface-paper p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-ink-primary">Openings by Department</h2>
              <p className="text-xs text-ink-secondary">Distribution of positions across organizational teams</p>
            </div>
            <span className="text-xs font-medium text-ink-secondary">{deptChartData.length} Departments</span>
          </div>
          {deptChartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-ink-disabled">
              No active job openings found
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-around h-64">
              <div className="w-full sm:w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deptChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {deptChartData.map((_, index) => (
                        <Cell key={`dept-${index}`} fill={DEPT_COLORS[index % DEPT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown) => [typeof val === 'number' ? val : 0, 'Openings']}
                      contentStyle={{ backgroundColor: 'rgb(var(--surface-paper))', borderRadius: '8px', border: '1px solid rgb(var(--grey-300))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full sm:w-1/2 space-y-2 text-xs">
                {deptChartData.slice(0, 5).map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: DEPT_COLORS[idx % DEPT_COLORS.length] }}
                      />
                      <span className="text-ink-primary truncate max-w-[140px]">{item.name}</span>
                    </span>
                    <span className="font-semibold text-ink-primary">{item.value} openings</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Two-Column Tables Section: Recent Applicants & Upcoming Interviews */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Applicants */}
        <div className="rounded-xl border border-divider bg-surface-paper p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-ink-primary">Recent Applicants</h2>
              <p className="text-xs text-ink-secondary">Latest candidate submissions</p>
            </div>
            <Link to="/recruitment/pipeline" className="text-xs font-semibold text-primary-main hover:underline">
              View all →
            </Link>
          </div>
          {recentApplicants.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-disabled">No applicants found.</p>
          ) : (
            <div className="divide-y divide-divider">
              {recentApplicants.map((app) => (
                <div key={app.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-lighter text-primary-dark flex items-center justify-center text-xs font-bold">
                      {app.name ? app.name.slice(0, 2).toUpperCase() : 'NA'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink-primary">{app.name}</p>
                      <p className="text-xs text-ink-secondary">{app.job_opening_title || 'General Opening'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 text-xs font-semibold rounded-full capitalize"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${STAGE_COLORS[app.status || 'Applied'] || 'rgb(var(--info-main))'} 8%, transparent)`,
                        color: STAGE_COLORS[app.status || 'Applied'] || 'rgb(var(--info-main))',
                      }}
                    >
                      {app.status || 'Applied'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Interviews */}
        <div className="rounded-xl border border-divider bg-surface-paper p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-ink-primary">Upcoming Interviews</h2>
              <p className="text-xs text-ink-secondary">Scheduled evaluation rounds</p>
            </div>
            <Link to="/recruitment/interviews" className="text-xs font-semibold text-primary-main hover:underline">
              Interview calendar →
            </Link>
          </div>
          {upcomingInterviews.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-disabled">No upcoming interviews scheduled.</p>
          ) : (
            <div className="divide-y divide-divider">
              {upcomingInterviews.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink-primary">{item.applicant_name || 'Candidate'}</p>
                    <p className="text-xs text-ink-secondary">
                      {item.scheduled_time ? new Date(item.scheduled_time).toLocaleString() : 'Date TBD'}
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-secondary-lighter text-secondary-dark border border-secondary-light">
                    {item.status || 'Scheduled'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

