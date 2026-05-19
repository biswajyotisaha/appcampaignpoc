import { useState, useEffect } from 'react';
import { ActiveUserStats, fetchActiveUserStats } from './api';
import ActiveUsersChart from './ActiveUsersChart';

export default function HomePage() {
  const [stats, setStats] = useState<ActiveUserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await fetchActiveUserStats();
      setStats(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Marketing Overview</h2>
        <p className="text-sm text-gray-500 mt-1">Last 30 days</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-medium">Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading stats...</div>
      ) : stats ? (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 px-6 py-5">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Users</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">{stats.totalActiveUsers}</span>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 px-6 py-5">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Non-Organic</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">{stats.nonOrganicInstalls}</span>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 px-6 py-5">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Organic</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">{stats.organicInstalls}</span>
              </div>
            </div>
          </div>

          {/* Charts */}
          <ActiveUsersChart daily={stats.daily} />
        </>
      ) : null}
    </div>
  );
}
