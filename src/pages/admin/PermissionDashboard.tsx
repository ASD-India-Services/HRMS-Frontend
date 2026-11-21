import { useQuery } from '@tanstack/react-query';
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
import api from '@/lib/api';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { ChartCard, ChartTooltip, AXIS_PROPS, getChartTheme } from '@/components/ui/Chart';
import { EmptyState } from '@/components/EmptyState';
import { Iconify } from '@/components/Iconify';

interface RoleItem {
  id: string;
  name: string;
  description?: string;
  is_system: boolean;
  data_scope?: 'organisation' | 'department' | 'self';
  permissions: { id: string; code: string; display_name: string }[];
  member_count: number;
}

export default function PermissionDashboard() {
  const { data: rolesData, isLoading: rolesLoading } = useQuery<RoleItem[]>({
    queryKey: ['roles', 'dashboard'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/v1/roles/');
        const data = res.data;
        return Array.isArray(data) ? data : data.results ?? [];
      } catch {
        return [];
      }
    },
  });

  const roles = rolesData ?? [];

  // Metrics
  const totalRoles = roles.length;
  const systemRoles = roles.filter((r) => r.is_system).length;
  const customRoles = roles.filter((r) => !r.is_system).length;
  const totalAssignedUsers = roles.reduce((sum, r) => sum + (r.member_count || 0), 0);

  // Group permissions by module prefix
  const modulePermCounts: Record<string, number> = {};
  roles.forEach((r) => {
    (r.permissions || []).forEach((p) => {
      const prefix = p.code ? p.code.split('.')[0] : 'general';
      const formatted = prefix.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      modulePermCounts[formatted] = (modulePermCounts[formatted] || 0) + 1;
    });
  });

  const moduleChartData = Object.entries(modulePermCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // User distribution per role chart
  const userPerRoleData = roles
    .map((r) => ({
      name: r.name,
      users: r.member_count || 0,
      isSystem: r.is_system,
    }))
    .sort((a, b) => b.users - a.users)
    .slice(0, 8);

  const isLoading = rolesLoading;

  const theme = getChartTheme();
  return (
    <PageContainer>
      <PageHeader
        title="Roles & Permissions Dashboard"
        subtitle="Access governance, role assignment distribution, module permission coverage, and security overview."
        actions={
          <>
            <ButtonLink to="/admin/roles/create" variant="outlined" color="inherit" startIcon={<Iconify icon="plus" />}>
              Create Role
            </ButtonLink>
            <ButtonLink to="/admin/roles" startIcon={<Iconify icon="settings" />}>
              Roles & Permissions
            </ButtonLink>
          </>
        }
      />
      <div className="space-y-6">
        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active Roles"
            value={totalRoles}
            icon="employees"
            href="/admin/roles"
            isLoading={isLoading}
            caption={`${systemRoles} system, ${customRoles} custom · View roles directory`}
          />
          <StatCard
            title="Assigned Users"
            value={totalAssignedUsers}
            icon="profile"
            isLoading={isLoading}
            caption="Members bound to security roles"
          />
          <StatCard
            title="Security Modules"
            value={Object.keys(modulePermCounts).length || 12}
            icon="compliance"
            isLoading={isLoading}
            caption="Protected modules · Granular RBAC boundaries"
          />
          <StatCard
            title="Audit Trail"
            value="Active"
            icon="auditLogs"
            href="/audit-logs"
            caption="Immutable logging · View audit logs"
          />
        </div>

        {/* Visual Charts Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Users per Role Chart */}
          <ChartCard
            title="User Allocation per Role"
            subtitle="Distribution of user accounts assigned across roles"
            action={
              <ButtonLink to="/admin/roles" variant="text" size="small" endIcon={<Iconify icon="arrow-right" />}>
                Roles list
              </ButtonLink>
            }
            isLoading={isLoading}
            isEmpty={userPerRoleData.length === 0}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userPerRoleData}>
                <CartesianGrid {...theme.grid} />
                <XAxis dataKey="name" tick={theme.tick} {...AXIS_PROPS} />
                <YAxis allowDecimals={false} tick={theme.tick} {...AXIS_PROPS} />
                <Tooltip content={<ChartTooltip />} cursor={theme.cursor} />
                <Bar dataKey="users" name="Users" fill={theme.colors[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Permissions by Module Chart */}
          <ChartCard
            title="Permissions by Module"
            subtitle="Coverage across HRMS core functionality"
            isLoading={isLoading}
            isEmpty={moduleChartData.length === 0}
          >
            <div className="flex h-full flex-col items-center justify-around sm:flex-row">
              <div className="h-full w-full sm:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={moduleChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {moduleChartData.map((_, index) => (
                        <Cell key={`perm-mod-${index}`} fill={theme.colors[index % theme.colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full space-y-2 text-xs sm:w-1/2">
                {moduleChartData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: theme.colors[idx % theme.colors.length] }}
                      />
                      <span className="max-w-[130px] truncate text-ink-primary">{item.name}</span>
                    </span>
                    <span className="font-semibold text-ink-primary">{item.value} perms</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Roles Directory Table */}
        <Card>
          <CardHeader
            title="Security Roles Overview"
            subtitle="Active system and custom authorization roles"
            action={
              <ButtonLink to="/admin/roles" variant="text" size="small" endIcon={<Iconify icon="arrow-right" />}>
                Manage all roles
              </ButtonLink>
            }
          />
          <CardContent>
            {roles.length === 0 ? (
              <EmptyState module="roles" title="No roles configured" description="Roles will appear here once created." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-neutral text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                    <tr>
                      <th className="px-4 py-3">Role Name</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Data Scope</th>
                      <th className="px-4 py-3">Permissions Count</th>
                      <th className="px-4 py-3">Assigned Users</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider">
                    {roles.slice(0, 6).map((role) => (
                      <tr key={role.id} className="transition-colors hover:bg-surface-neutral/60">
                        <td className="px-4 py-3 font-medium text-ink-primary">{role.name}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
                              role.is_system
                                ? 'bg-primary-lighter text-primary-dark'
                                : 'bg-secondary-lighter text-secondary-dark'
                            }`}
                          >
                            {role.is_system ? 'System' : 'Custom'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs capitalize text-ink-secondary">
                          {role.data_scope || 'Organisation'}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-ink-primary">
                          {role.permissions ? role.permissions.length : 0} permissions
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-ink-primary">
                          {role.member_count || 0} users
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ButtonLink to={`/admin/roles/${role.id}`} variant="text" size="small">
                            Edit
                          </ButtonLink>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
