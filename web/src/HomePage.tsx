import { useState, useEffect } from 'react';
import { ActiveUserStats, RegisteredApp, fetchActiveUserStats, fetchRegisteredApps } from './api';
import ActiveUsersChart from './ActiveUsersChart';

export default function HomePage() {
  const [stats, setStats] = useState<ActiveUserStats | null>(null);
  const [apps, setApps] = useState<RegisteredApp[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [selectedApp, setSelectedApp] = useState<string>('');

  // Get apps filtered by selected platform
  const filteredApps = selectedPlatform
    ? apps.filter(a => a.platform === selectedPlatform)
    : apps;

  const loadApps = async () => {
    try {
      const data = await fetchRegisteredApps();
      setApps(data.apps);
      setPlatforms(data.platforms);
    } catch (_) { /* ignore */ }
  };

  const loadStats = async (platform?: string, bundleId?: string) => {
    try {
      setLoading(true);
      const data = await fetchActiveUserStats(platform || undefined, bundleId || undefined);
      setStats(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApps();
    loadStats();
  }, []);

  // Reload stats when filters change
  useEffect(() => {
    loadStats(selectedPlatform, selectedApp);
  }, [selectedPlatform, selectedApp]);

  const handlePlatformChange = (val: string) => {
    setSelectedPlatform(val);
    setSelectedApp(''); // Reset app when platform changes
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Marketing Overview</h2>
          <p className="text-sm text-gray-500 mt-1">Last 30 days</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={selectedPlatform}
            onChange={(e) => handlePlatformChange(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-md text-sm bg-white focus:ring-2 focus:ring-[#1a1f36] focus:border-[#1a1f36]"
          >
            <option value="">All Platforms</option>
            {platforms.map(p => (
              <option key={p} value={p}>{p === 'ios' ? 'iOS' : p === 'android' ? 'Android' : p}</option>
            ))}
          </select>

          <select
            value={selectedApp}
            onChange={(e) => setSelectedApp(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-md text-sm bg-white focus:ring-2 focus:ring-[#1a1f36] focus:border-[#1a1f36]"
            disabled={filteredApps.length === 0}
          >
            <option value="">All Apps</option>
            {filteredApps.map(a => (
              <option key={`${a.platform}-${a.bundleId}`} value={a.bundleId}>{a.bundleId}</option>
            ))}
          </select>
        </div>
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
