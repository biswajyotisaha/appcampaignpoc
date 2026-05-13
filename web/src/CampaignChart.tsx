import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">
          Analytics: {campaign.name}
        </h3>
        <button
          onClick={onClose}
          className="text-xs text-gray-500 hover:text-gray-700 font-medium"
        >
          Close
        </button>
      </div>

      {loading && (
        <div className="text-center py-8 text-gray-400 text-sm">Loading stats...</div>
      )}

      {!loading && (!stats || stats.daily.length === 0) && (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">No data yet. Clicks and installs will appear here once activity is recorded.</p>
          <div className="mt-3 grid grid-cols-2 gap-4 max-w-xs mx-auto">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-700">{campaign.clickCount}</div>
              <div className="text-xs text-green-600">Total Clicks</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-700">{campaign.installCount}</div>
              <div className="text-xs text-blue-600">Total Installs</div>
            </div>
          </div>
        </div>
      )}

      {!loading && stats && stats.daily.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-4 max-w-xs">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-700">{stats.totalClicks}</div>
              <div className="text-xs text-green-600">Total Clicks</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-700">{stats.totalInstalls}</div>
              <div className="text-xs text-blue-600">Total Installs</div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={stats.daily} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
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
                dataKey="clicks"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Clicks"
              />
              <Line
                type="monotone"
                dataKey="installs"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Installs"
              />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
