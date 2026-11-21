import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useJobOpenings, useApplicants, useInterviews } from '@/hooks/useRecruitment';
import { Iconify } from '@/components/Iconify';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { DonutChart, ChartCard, ChartTooltip, AXIS_PROPS, getChartTheme } from '@/components/ui/Chart';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';

const STAGE_COLORS: Record<string, string> = {
  Applied: 'rgb(var(--info-main))',
  Screening: 'rgb(var(--secondary-main))',
  Interview: 'rgb(var(--warning-main))',
  Selected: 'rgb(var(--success-main))',
  Hired: 'rgb(var(--success-dark))',
  Rejected: 'rgb(var(--error-main))',
  Other: 'rgb(var(--grey-500))',
};

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
  const theme = getChartTheme();

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

      <div className="space-y-6">
        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active Positions"
            value={activeOpenings}
            icon="recruitment"
            isLoading={isLoading}
            href="/recruitment/job-openings"
            caption={`of ${totalOpenings} total`}
          />
          <StatCard
            title="Total Candidates"
            value={totalApplicants}
            icon="employees"
            isLoading={isLoading}
            href="/recruitment/pipeline"
            caption="applicants received"
          />
          <StatCard
            title="In Evaluation"
            value={inEvaluation}
            icon="onboardingTemplates"
            isLoading={isLoading}
            caption="screening / interview"
          />
          <StatCard
            title="Hired / Selected"
            value={hiredCount}
            icon="success"
            isLoading={isLoading}
            caption="Offer accepted"
          />
        </div>

        {/* Visual Charts Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard
            title="Applicant Pipeline Stages"
            subtitle="Candidate distribution across active recruitment stages"
            action={
              <ButtonLink to="/recruitment/stages" variant="text" size="small" endIcon={<Iconify icon="arrow-right" />}>
                Stages Setup
              </ButtonLink>
            }
            isLoading={isLoading}
            isEmpty={applicants.length === 0}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineChartData}>
                <CartesianGrid {...theme.grid} />
                <XAxis dataKey="label" tick={theme.tick} {...AXIS_PROPS} />
                <YAxis allowDecimals={false} tick={theme.tick} {...AXIS_PROPS} />
                <Tooltip content={<ChartTooltip />} cursor={theme.cursor} />
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
            isLoading={isLoading}
            isEmpty={deptChartData.length === 0}
          >
            <DonutChart
              data={deptChartData.slice(0, 5).map((item, idx) => ({ ...item, color: theme.colors[idx % theme.colors.length] }))}
              formatValue={(item) => `${item.value} openings`}
            />
          </ChartCard>
        </div>

        {/* Recent Applicants & Upcoming Interviews */}
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
                <div className="divide-y divide-divider">
                  {recentApplicants.map((app) => (
                    <div key={app.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-lighter text-xs font-bold text-primary-dark">
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
                          backgroundColor: `color-mix(in srgb, ${STAGE_COLORS[app.status || 'Applied'] || 'rgb(var(--info-main))'} 8%, transparent)`,
                          color: STAGE_COLORS[app.status || 'Applied'] || 'rgb(var(--info-main))',
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
                <div className="divide-y divide-divider">
                  {upcomingInterviews.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-ink-primary">{item.applicant_name || 'Candidate'}</p>
                        <p className="text-xs text-ink-secondary">
                          {item.scheduled_time ? new Date(item.scheduled_time).toLocaleString() : 'Date TBD'}
                        </p>
                      </div>
                      <span className="rounded-full bg-secondary-main/10 px-2.5 py-0.5 text-xs font-medium text-secondary-dark">
                        {item.status || 'Scheduled'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
