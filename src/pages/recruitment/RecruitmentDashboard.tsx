import { useState, useMemo } from 'react';
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
import { useEmployees } from '@/hooks/useEmployees';
import { formatDateTime } from '@/utils/formatters';

const STAGE_COLORS: Record<string, string> = {
  Applied: '#3b82f6',
  Screening: '#8b5cf6',
  Interview: '#f59e0b',
  Selected: '#10b981',
  Hired: '#059669',
  Rejected: '#ef4444',
  Other: '#6b7280',
};

const DEPT_COLORS = ['#38bdf8', '#f43f5e', '#fb923c', '#10b981', '#8b5cf6', '#06b6d4', '#ec4899'];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function RecruitmentDashboard() {
  const currentYear = new Date().getFullYear();
  const [joiningYear, setJoiningYear] = useState<number>(currentYear);

  // 1. Fetch Job Openings
  const { data: openingsData, isLoading: openingsLoading } = useJobOpenings({ page: 1, page_size: 100 });
  const openings = openingsData?.results ?? [];

  // 2. Fetch Applicants
  const { data: applicantsData, isLoading: applicantsLoading } = useApplicants({ page: 1, page_size: 100 });
  const applicants = applicantsData?.results ?? [];

  // 3. Fetch Interviews
  const { data: interviewsData, isLoading: interviewsLoading } = useInterviews({ page: 1, page_size: 100 });
  const interviews = interviewsData?.results ?? [];

  // 4. Fetch Employees (for Joinings Per Month)
  const { data: employeesResponse, isLoading: employeesLoading } = useEmployees({ page_size: 200 });
  const employees = employeesResponse?.results ?? [];

  // ─── 5 Top Cards Metrics (Matching Screenshot 1) ──────────────────────────
  
  // Card 1: Total Vacancies
  const totalVacancies = useMemo(() => {
    return openings.reduce((sum, job) => sum + (Number(job.vacancies) || 1), 0);
  }, [openings]);

  // Card 2: Ongoing Recruitments (Open / Active Job Openings)
  const ongoingRecruitments = useMemo(() => {
    return openings.filter((job) => (job.status || '').toLowerCase() === 'open').length;
  }, [openings]);

  // Card 3: Hired Candidates
  const hiredCount = useMemo(() => {
    return applicants.filter((app) =>
      ['selected', 'hired', 'onboarded'].includes((app.status || '').toLowerCase())
    ).length;
  }, [applicants]);

  const totalApplicants = applicantsData?.count ?? applicants.length;

  // Card 4: Conversion Rate (Hired / Total Applicants)
  const conversionRate = useMemo(() => {
    if (totalApplicants === 0) return '0%';
    const pct = Math.round((hiredCount / totalApplicants) * 100);
    return `${pct}%`;
  }, [hiredCount, totalApplicants]);

  // Card 5: Offer Acceptance Rate (OAR) (Hired / Offers Extended)
  const offerAcceptanceRate = useMemo(() => {
    const offersCount = applicants.filter((app) =>
      ['selected', 'hired', 'onboarded', 'offered'].includes((app.status || '').toLowerCase())
    ).length;
    if (offersCount === 0) return '0%';
    const pct = Math.round((hiredCount / offersCount) * 100);
    return `${pct}%`;
  }, [hiredCount, applicants]);

  // ─── Joinings Per Month Chart Data (Matching Screenshot 2) ─────────────────
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(currentYear);
    employees.forEach((emp) => {
      if (emp.date_of_joining) {
        const yr = parseInt(emp.date_of_joining.split('-')[0], 10);
        if (yr && !isNaN(yr)) yearsSet.add(yr);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [employees, currentYear]);

  const joiningsChartData = useMemo(() => {
    const counts = new Array(12).fill(0);

    // Count joinings from real employee date_of_joining
    employees.forEach((emp) => {
      if (emp.date_of_joining) {
        const parts = emp.date_of_joining.split('-');
        if (parts.length >= 2) {
          const yr = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          if (yr === joiningYear && m >= 0 && m < 12) {
            counts[m]++;
          }
        }
      }
    });

    // Check applicants hired with date if present
    applicants.forEach((app) => {
      const status = (app.status || '').toLowerCase();
      if (['hired', 'onboarded', 'selected'].includes(status)) {
        const rawDate = (app as any).joining_date || (app as any).hired_date;
        if (rawDate && typeof rawDate === 'string') {
          const parts = rawDate.split('-');
          if (parts.length >= 2) {
            const yr = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            if (yr === joiningYear && m >= 0 && m < 12) {
              counts[m]++;
            }
          }
        }
      }
    });

    return MONTH_NAMES.map((month, idx) => ({
      month,
      count: counts[idx],
    }));
  }, [employees, applicants, joiningYear]);

  // ─── Pipeline Stage Chart Data ────────────────────────────────────────────
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
    fill: STAGE_COLORS[label] || '#3b82f6',
  }));

  // ─── Department Distribution ──────────────────────────────────────────────
  const deptCounts: Record<string, number> = {};
  openings.forEach((job) => {
    const dept = job.department_name || (typeof job.department === 'object' && job.department?.name) || 'IT';
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });

  const deptChartData = Object.entries(deptCounts).map(([name, value]) => ({
    name,
    value,
  }));

  const recentApplicants = [...applicants].slice(0, 5);
  const upcomingInterviews = [...interviews].slice(0, 5);

  const isLoading = openingsLoading || applicantsLoading || interviewsLoading || employeesLoading;

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recruitment Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Real-time hiring metrics, applicant pipeline progression, and recruitment analytics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/recruitment/job-openings"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Job Openings
          </Link>
          <Link
            to="/recruitment/pipeline"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
            </svg>
            Open Pipeline
          </Link>
        </div>
      </div>

      {/* ─── Top 5 Metric Cards (Matching Screenshot 1) ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Vacancies */}
        <div className="bg-white rounded-sm border border-gray-100 shadow-sm border-t-[3px] border-t-[#e88b20] p-4 flex flex-col justify-between">
          <div className="text-xs md:text-sm font-bold text-gray-900">Total Vacancies</div>
          <div className="mt-4 text-4xl lg:text-5xl font-normal text-gray-800 tracking-tight">
            {isLoading ? '...' : totalVacancies}
          </div>
        </div>

        {/* Card 2: Ongoing Recruitments */}
        <div className="bg-white rounded-sm border border-gray-100 shadow-sm border-t-[3px] border-t-[#d93025] p-4 flex flex-col justify-between">
          <div className="text-xs md:text-sm font-bold text-gray-900">Ongoing Recruitments</div>
          <div className="mt-4 text-4xl lg:text-5xl font-normal text-gray-800 tracking-tight">
            {isLoading ? '...' : ongoingRecruitments}
          </div>
        </div>

        {/* Card 3: Hired Candidates */}
        <div className="bg-white rounded-sm border border-gray-100 shadow-sm border-t-[3px] border-t-[#16a34a] p-4 flex flex-col justify-between">
          <div className="text-xs md:text-sm font-bold text-gray-900">Hired Candidates</div>
          <div className="mt-4 text-4xl lg:text-5xl font-normal text-gray-800 tracking-tight">
            {isLoading ? '...' : hiredCount}
          </div>
        </div>

        {/* Card 4: Conversion Rate */}
        <div className="bg-white rounded-sm border border-gray-100 shadow-sm border-t-[3px] border-t-[#8c9ba5] p-4 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs md:text-sm font-bold text-gray-900">
            <span>Conversion Rate</span>
            <span
              className="inline-flex items-center justify-center w-3.5 h-3.5 text-[9px] rounded-full border border-gray-400 text-gray-500 font-semibold cursor-help"
              title="Percentage of total applicants who were successfully hired"
            >
              ?
            </span>
          </div>
          <div className="mt-4 text-4xl lg:text-5xl font-normal text-gray-800 tracking-tight">
            {isLoading ? '...' : conversionRate}
          </div>
        </div>

        {/* Card 5: Offer Acceptance Rate (OAR) */}
        <div className="bg-white rounded-sm border border-gray-100 shadow-sm border-t-[3px] border-t-[#16a34a] p-4 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs md:text-sm font-bold text-gray-900">
            <span>Offer Acceptance Rate (OAR)</span>
            <span
              className="inline-flex items-center justify-center w-3.5 h-3.5 text-[9px] rounded-full border border-gray-400 text-gray-500 font-semibold cursor-help"
              title="Percentage of extended job offers accepted by candidates"
            >
              ?
            </span>
          </div>
          <div className="mt-4 text-4xl lg:text-5xl font-normal text-gray-800 tracking-tight">
            {isLoading ? '...' : offerAcceptanceRate}
          </div>
        </div>
      </div>

      {/* ─── Joinings Per Month Chart (Matching Screenshot 2) ─────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200/80 p-5 shadow-xs">
        {/* Header & Controls matching screenshot */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
          <h2 className="text-sm font-bold text-gray-900">Joinings Per Month</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-gray-300 rounded px-2.5 py-1 text-xs text-gray-700 bg-white">
              <select
                value={joiningYear}
                onChange={(e) => setJoiningYear(Number(e.target.value))}
                className="bg-transparent text-xs text-gray-700 focus:outline-none cursor-pointer pr-1"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                const idx = availableYears.indexOf(joiningYear);
                if (idx > 0) setJoiningYear(availableYears[idx - 1]);
                else setJoiningYear(availableYears[availableYears.length - 1]);
              }}
              className="text-gray-400 hover:text-gray-700 text-xs px-1 cursor-pointer select-none"
              title="Toggle Year"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Legend matching screenshot */}
        <div className="flex items-center justify-center gap-2 mb-4 text-xs text-gray-600">
          <span className="w-5 h-2.5 rounded-2xs inline-block bg-[#e88b20]" />
          <span className="font-medium">Employees joined in {joiningYear}</span>
        </div>

        {/* Orange Bar Chart */}
        <div className="h-72 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={joiningsChartData}
              margin={{ top: 10, right: 15, left: -20, bottom: 45 }}
              barSize={34}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                interval={0}
                angle={-35}
                textAnchor="end"
                tick={{ fontSize: 10, fill: '#64748b' }}
                height={45}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis
                allowDecimals={true}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <Tooltip
                formatter={(val: unknown) => [`${typeof val === 'number' ? val : 0} employees`, 'Joined']}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  fontSize: '11px',
                }}
              />
              <Bar dataKey="count" fill="#e88b20" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Visual Charts Grid: Pipeline Stages & Openings by Department ─────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pipeline Stage Funnel Chart */}
        <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Applicant Pipeline Stages</h2>
              <p className="text-xs text-gray-500">Candidate distribution across active recruitment stages</p>
            </div>
            <Link to="/recruitment/stages" className="text-xs font-medium text-blue-600 hover:underline">
              Stages Setup →
            </Link>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: unknown) => [typeof val === 'number' ? val : 0, 'Applicants']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
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
        <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Openings by Department</h2>
              <p className="text-xs text-gray-500">Distribution of positions across organizational teams</p>
            </div>
            <span className="text-xs font-medium text-gray-500">{deptChartData.length} Departments</span>
          </div>
          {deptChartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-gray-400">
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
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
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
                      <span className="text-gray-700 truncate max-w-[140px]">{item.name}</span>
                    </span>
                    <span className="font-semibold text-gray-900">{item.value} openings</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Two-Column Tables Section: Recent Applicants & Upcoming Interviews ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Applicants */}
        <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Recent Applicants</h2>
              <p className="text-xs text-gray-500">Latest candidate submissions</p>
            </div>
            <Link to="/recruitment/pipeline" className="text-xs font-semibold text-blue-600 hover:underline">
              View all →
            </Link>
          </div>
          {recentApplicants.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No applicants found.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentApplicants.map((app) => (
                <div key={app.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                      {app.name ? app.name.slice(0, 2).toUpperCase() : 'NA'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{app.name}</p>
                      <p className="text-xs text-gray-500">{app.job_opening_title || 'General Opening'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 text-xs font-semibold rounded-full capitalize"
                      style={{
                        backgroundColor: `${STAGE_COLORS[app.status || 'Applied'] || '#3b82f6'}15`,
                        color: STAGE_COLORS[app.status || 'Applied'] || '#3b82f6',
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
        <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Upcoming Interviews</h2>
              <p className="text-xs text-gray-500">Scheduled evaluation rounds</p>
            </div>
            <Link to="/recruitment/interviews" className="text-xs font-semibold text-blue-600 hover:underline">
              Interview calendar →
            </Link>
          </div>
          {upcomingInterviews.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No upcoming interviews scheduled.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {upcomingInterviews.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.applicant_name || 'Candidate'}</p>
                    <p className="text-xs text-gray-500">
                      {item.scheduled_time ? formatDateTime(item.scheduled_time) : 'Date TBD'}
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
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
