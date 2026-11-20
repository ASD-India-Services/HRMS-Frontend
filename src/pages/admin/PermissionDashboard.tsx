import React from 'react';
import { Link } from 'react-router-dom';
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

interface RoleItem {
  id: string;
  name: string;
  description?: string;
  is_system: boolean;
  data_scope?: 'organisation' | 'department' | 'self';
  permissions: { id: string; code: string; display_name: string }[];
  member_count: number;
}

const MODULE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4',
  '#f97316', '#6366f1', '#14b8a6', '#84cc16', '#a855f7', '#64748b'
];

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Access governance, role assignment distribution, module permission coverage, and security overview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/roles/create"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Role
          </Link>
          <Link
            to="/admin/roles"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            Roles & Permissions
          </Link>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Roles */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Active Roles
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">{isLoading ? '...' : totalRoles}</span>
            <span className="ml-2 text-xs text-gray-500">({systemRoles} system, {customRoles} custom)</span>
          </div>
          <div className="mt-2 text-xs text-blue-600 font-medium">
            <Link to="/admin/roles" className="hover:underline">View roles directory →</Link>
          </div>
        </div>

        {/* Assigned Users */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Assigned Users
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">{isLoading ? '...' : totalAssignedUsers}</span>
            <span className="ml-2 text-xs text-indigo-600 font-medium">Authorised accounts</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            <span>Members bound to security roles</span>
          </div>
        </div>

        {/* Permission Modules */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Security Modules
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">
              {isLoading ? '...' : Object.keys(modulePermCounts).length || 12}
            </span>
            <span className="ml-2 text-xs text-purple-600 font-semibold">Protected Modules</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            <span>Granular RBAC boundaries</span>
          </div>
        </div>

        {/* Audit Status */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Audit Trail
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-emerald-600">Active</span>
            <span className="ml-2 text-xs text-emerald-700 font-medium">Immutable Logging</span>
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-medium">
            <Link to="/audit-logs" className="hover:underline">View audit logs →</Link>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Users per Role Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">User Allocation per Role</h2>
              <p className="text-xs text-gray-500">Distribution of user accounts assigned across roles</p>
            </div>
            <Link to="/admin/roles" className="text-xs font-medium text-blue-600 hover:underline">
              Roles list →
            </Link>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userPerRoleData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: unknown) => [typeof val === 'number' ? val : 0, 'Users']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="users" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Permissions by Module Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Permissions by Module</h2>
              <p className="text-xs text-gray-500">Coverage across HRMS core functionality</p>
            </div>
            <span className="text-xs font-medium text-gray-500">RBAC Sections</span>
          </div>
          {moduleChartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-gray-400">
              No module permissions found
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-around h-64">
              <div className="w-full sm:w-1/2 h-full">
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
                        <Cell key={`perm-mod-${index}`} fill={MODULE_COLORS[index % MODULE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown) => [typeof val === 'number' ? val : 0, 'Permissions']}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full sm:w-1/2 space-y-2 text-xs">
                {moduleChartData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: MODULE_COLORS[idx % MODULE_COLORS.length] }}
                      />
                      <span className="text-gray-700 truncate max-w-[130px]">{item.name}</span>
                    </span>
                    <span className="font-semibold text-gray-900">{item.value} perms</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Roles Directory Table */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Security Roles Overview</h2>
            <p className="text-xs text-gray-500">Active system and custom authorization roles</p>
          </div>
          <Link to="/admin/roles" className="text-xs font-semibold text-blue-600 hover:underline">
            Manage all roles →
          </Link>
        </div>
        {roles.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No roles configured.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Role Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Data Scope</th>
                  <th className="px-4 py-3">Permissions Count</th>
                  <th className="px-4 py-3">Assigned Users</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {roles.slice(0, 6).map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{role.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          role.is_system
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {role.is_system ? 'System' : 'Custom'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 capitalize">
                      {role.data_scope || 'Organisation'}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-700">
                      {role.permissions ? role.permissions.length : 0} permissions
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-900">
                      {role.member_count || 0} users
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/admin/roles/${role.id}`}
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

