import { useState, useEffect } from 'react';
import { ActiveUserStats, fetchActiveUserStats, clearActiveUserData } from './api';
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

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear ALL active user data? This cannot be undone.')) return;
    try {
      await clearActiveUserData();
      await loadStats();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Active Users</h2>
          <p className="text-sm text-gray-500 mt-0.5">30-day rolling window of unique app launches</p>
        </div>
        <button
          onClick={handleClearData}
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
        >
          Clear All Data
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-medium">Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading stats...</div>
      ) : stats ? (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
              <div className="text-3xl font-bold text-indigo-600">{stats.totalActiveUsers}</div>
              <div className="text-sm text-gray-500 mt-1">Total Active Users</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.nonOrganicInstalls}</div>
              <div className="text-sm text-gray-500 mt-1">Non-Organic Launches</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
              <div className="text-3xl font-bold text-green-600">{stats.organicInstalls}</div>
              <div className="text-sm text-gray-500 mt-1">Organic Launches</div>
            </div>
          </div>

          {/* Charts */}
          <ActiveUsersChart daily={stats.daily} />
        </>
      ) : null}
    </div>
  );
}
