import { useState, useMemo } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useJobOpenings, useApplicants, useInterviews } from '@/hooks/useRecruitment';
import { useEmployees } from '@/hooks/useEmployees';
import { formatDateTime } from '@/utils/formatters';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { ButtonLink, IconButton } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { ChartCard, ChartTooltip, DonutChart, AXIS_PROPS, getChartColors, getChartTheme } from '@/components/ui/Chart';
import { Iconify } from '@/components/Iconify';

/** Design-token channel for each stage; used for chart fills and status chips. */
const STAGE_TOKENS: Record<string, string> = {
  Applied: 'info-main',
  Screening: 'secondary-main',
  Interview: 'warning-main',
  Selected: 'success-main',
  Hired: 'success-dark',
  Rejected: 'error-main',
  Other: 'grey-600',
};
const stageToken = (status: string) => STAGE_TOKENS[status] || 'info-main';
const stageColor = (status: string) => `rgb(var(--${stageToken(status)}))`;
const stageTint = (status: string) => `rgb(var(--${stageToken(status)}) / 0.12)`;

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
  const openings = useMemo(() => openingsData?.results ?? [], [openingsData]);

  // 2. Fetch Applicants
  const { data: applicantsData, isLoading: applicantsLoading } = useApplicants({ page: 1, page_size: 100 });
  const applicants = useMemo(() => applicantsData?.results ?? [], [applicantsData]);

  // 3. Fetch Interviews
  const { data: interviewsData, isLoading: interviewsLoading } = useInterviews({ page: 1, page_size: 100 });
  const interviews = interviewsData?.results ?? [];

  // 4. Fetch Employees (for Joinings Per Month)
  const { data: employeesResponse, isLoading: employeesLoading } = useEmployees({ page_size: 200 });
  const employees = useMemo(() => employeesResponse?.results ?? [], [employeesResponse]);

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
    fill: stageColor(label),
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

  const theme = getChartTheme();
  const deptColors = getChartColors();
  const deptDonutData = deptChartData.map((item, idx) => ({ ...item, color: deptColors[idx % deptColors.length] }));

  return (
    <PageContainer>
      <PageHeader
        title="Recruitment Dashboard"
        subtitle="Real-time hiring metrics, applicant pipeline progression, and recruitment analytics."
        actions={
          <>
            <ButtonLink to="/recruitment/job-openings" variant="outlined" color="inherit" startIcon={<Iconify icon="recruitment" />}>
              Job Openings
            </ButtonLink>
            <ButtonLink to="/recruitment/pipeline" startIcon={<Iconify icon="pipeline" />}>
              Open Pipeline
            </ButtonLink>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total Vacancies" value={totalVacancies} icon="recruitment" isLoading={isLoading} />
        <StatCard title="Ongoing Recruitments" value={ongoingRecruitments} icon="pipeline" isLoading={isLoading} />
        <StatCard title="Hired Candidates" value={hiredCount} icon="employees" isLoading={isLoading} />
        <StatCard
          title="Conversion Rate"
          value={conversionRate}
          icon="chart"
          caption="Percentage of total applicants who were successfully hired"
          isLoading={isLoading}
        />
        <StatCard
          title="Offer Acceptance Rate (OAR)"
          value={offerAcceptanceRate}
          icon="success"
          caption="Percentage of extended job offers accepted by candidates"
          isLoading={isLoading}
        />
      </div>

      <div className="mb-6">
        <ChartCard
          title="Joinings Per Month"
          subtitle={`Employees joined in ${joiningYear}`}
          height={320}
          action={
            <div className="flex items-center gap-2">
              <Select
                selectSize="small"
                aria-label="Joining year"
                className="w-24"
                value={joiningYear}
                onChange={(e) => setJoiningYear(Number(e.target.value))}
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </Select>
              <IconButton
                icon="chevron-right"
                size="small"
                aria-label="Toggle Year"
                title="Toggle Year"
                onClick={() => {
                  const idx = availableYears.indexOf(joiningYear);
                  if (idx > 0) setJoiningYear(availableYears[idx - 1]);
                  else setJoiningYear(availableYears[availableYears.length - 1]);
                }}
              />
            </div>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={joiningsChartData} margin={{ bottom: 40 }}>
              <CartesianGrid {...theme.grid} />
              <XAxis dataKey="month" interval={0} angle={-35} textAnchor="end" tick={theme.tick} height={50} {...AXIS_PROPS} />
              <YAxis allowDecimals tick={theme.tick} {...AXIS_PROPS} />
              <Tooltip
                content={<ChartTooltip />}
                cursor={theme.cursor}
              />
              <Bar dataKey="count" name="Joined" fill="rgb(var(--primary-main))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          title="Applicant Pipeline Stages"
          subtitle="Candidate distribution across active recruitment stages"
          action={
            <ButtonLink to="/recruitment/stages" variant="text" size="small" endIcon={<Iconify icon="arrow-right" />}>
              Stages Setup
            </ButtonLink>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pipelineChartData}>
              <CartesianGrid {...theme.grid} />
              <XAxis dataKey="label" tick={theme.tick} {...AXIS_PROPS} />
              <YAxis allowDecimals={false} tick={theme.tick} {...AXIS_PROPS} />
              <Tooltip
                content={<ChartTooltip />}
                cursor={theme.cursor}
              />
              <Bar dataKey="count" name="Applicants" radius={[4, 4, 0, 0]}>
                {pipelineChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Openings by Department"
          subtitle="Distribution of positions across organizational teams"
          action={<span className="text-xs font-medium text-ink-secondary">{deptChartData.length} Departments</span>}
          isEmpty={deptChartData.length === 0}
        >
          <DonutChart data={deptDonutData.slice(0, 6)} formatValue={(item) => `${item.value} openings`} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Recent Applicants"
            subtitle="Latest candidate submissions"
            action={
              <ButtonLink to="/recruitment/pipeline" variant="text" size="small" endIcon={<Iconify icon="arrow-right" />}>
                View all
              </ButtonLink>
            }
          />
          <CardContent>
            {recentApplicants.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-disabled">No applicants found.</p>
            ) : (
              <div className="divide-y divide-grey-500/20">
                {recentApplicants.map((app) => (
                  <div key={app.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-main/10 text-xs font-bold text-primary-dark">
                        {app.name ? app.name.slice(0, 2).toUpperCase() : 'NA'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink-primary">{app.name}</p>
                        <p className="text-xs text-ink-secondary">{app.job_opening_title || 'General Opening'}</p>
                      </div>
                    </div>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold capitalize"
                      style={{
                        backgroundColor: stageTint(app.status || 'Applied'),
                        color: stageColor(app.status || 'Applied'),
                      }}
                    >
                      {app.status || 'Applied'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Upcoming Interviews"
            subtitle="Scheduled evaluation rounds"
            action={
              <ButtonLink to="/recruitment/interviews" variant="text" size="small" endIcon={<Iconify icon="arrow-right" />}>
                Interview calendar
              </ButtonLink>
            }
          />
          <CardContent>
            {upcomingInterviews.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-disabled">No upcoming interviews scheduled.</p>
            ) : (
              <div className="divide-y divide-grey-500/20">
                {upcomingInterviews.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-ink-primary">{item.applicant_name || 'Candidate'}</p>
                      <p className="text-xs text-ink-secondary">
                        {item.scheduled_time ? formatDateTime(item.scheduled_time) : 'Date TBD'}
                      </p>
                    </div>
                    <span className="rounded-full bg-info-main/10 px-2.5 py-0.5 text-xs font-medium text-info-dark">
                      {item.status || 'Scheduled'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
