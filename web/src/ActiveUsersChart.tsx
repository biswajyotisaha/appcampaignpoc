import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Daily Active Users (30 days)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={daily} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={(val) => {
                const d = new Date(val + 'T00:00:00');
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              labelFormatter={(val) => `Date: ${val}`}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Unique Users"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Organic vs Non-Organic */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Organic vs Non-Organic (30 days)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={daily} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={(val) => {
                const d = new Date(val + 'T00:00:00');
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              labelFormatter={(val) => `Date: ${val}`}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="organic"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Organic"
            />
            <Line
              type="monotone"
              dataKey="nonOrganic"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Non-Organic"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
