import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { ActiveUserDailyStat } from './api';

interface Props {
  daily: ActiveUserDailyStat[];
}

export default function ActiveUsersChart({ daily }: Props) {
  if (daily.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        No active user data yet. Data will appear once app launches are recorded.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Daily Active Users */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Daily Active Users</h3>
        <p className="text-xs text-gray-400 mb-4">Last 30 days</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={daily} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickFormatter={(val) => {
                const d = new Date(val + 'T00:00:00');
                return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
              }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} axisLine={false} tickLine={false} />
            <Tooltip
              labelFormatter={(val) => `Date: ${val}`}
              contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="total"
              fill="#4f86f7"
              radius={[3, 3, 0, 0]}
              name="Active Users"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Organic vs Non-Organic */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Organic vs Non-Organic</h3>
        <p className="text-xs text-gray-400 mb-4">Attribution breakdown</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={daily} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickFormatter={(val) => {
                const d = new Date(val + 'T00:00:00');
                return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
              }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} axisLine={false} tickLine={false} />
            <Tooltip
              labelFormatter={(val) => `Date: ${val}`}
              contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="organic"
              fill="#34d399"
              radius={[3, 3, 0, 0]}
              name="Organic"
            />
            <Bar
              dataKey="nonOrganic"
              fill="#4f86f7"
              radius={[3, 3, 0, 0]}
              name="Non-Organic"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
