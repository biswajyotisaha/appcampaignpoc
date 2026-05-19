import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Campaign, CampaignStats, fetchCampaignStats } from './api';

interface Props {
  campaign: Campaign;
  onClose: () => void;
}

export default function CampaignChart({ campaign, onClose }: Props) {
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaignStats(campaign.id)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [campaign.id]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">
          {campaign.name}
        </h3>
        <button
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600 font-medium"
        >
          Close
        </button>
      </div>

      {loading && (
        <div className="text-center py-8 text-gray-400 text-sm">Loading stats...</div>
      )}

      {!loading && (!stats || stats.daily.length === 0) && (
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm">No data yet. Activity will appear here once recorded.</p>
          <div className="mt-3 grid grid-cols-2 gap-4 max-w-xs mx-auto">
            <div className="bg-gray-50 rounded-md p-3 text-center border border-gray-100">
              <div className="text-2xl font-bold text-gray-900">{campaign.clickCount}</div>
              <div className="text-xs text-gray-500">Total Clicks</div>
            </div>
            <div className="bg-gray-50 rounded-md p-3 text-center border border-gray-100">
              <div className="text-2xl font-bold text-gray-900">{campaign.installCount}</div>
              <div className="text-xs text-gray-500">Total Installs</div>
            </div>
          </div>
        </div>
      )}

      {!loading && stats && stats.daily.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-4 max-w-xs">
            <div className="bg-gray-50 rounded-md p-3 text-center border border-gray-100">
              <div className="text-2xl font-bold text-gray-900">{stats.totalClicks}</div>
              <div className="text-xs text-gray-500">Total Clicks</div>
            </div>
            <div className="bg-gray-50 rounded-md p-3 text-center border border-gray-100">
              <div className="text-2xl font-bold text-gray-900">{stats.totalInstalls}</div>
              <div className="text-xs text-gray-500">Total Installs</div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.daily} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                dataKey="clicks"
                fill="#4f86f7"
                radius={[3, 3, 0, 0]}
                name="Clicks"
              />
              <Bar
                dataKey="installs"
                fill="#34d399"
                radius={[3, 3, 0, 0]}
                name="Installs"
              />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
