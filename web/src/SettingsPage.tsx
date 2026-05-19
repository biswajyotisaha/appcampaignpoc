import { useState } from 'react';
import { clearActiveUserData } from './api';

export default function SettingsPage() {
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear ALL data? This will delete all campaigns, clicks, installs, and active user records. This cannot be undone.')) return;
    try {
      setClearing(true);
      setMessage(null);
      await clearActiveUserData();
      setMessage({ type: 'success', text: 'All data has been cleared successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Manage application data and configuration</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg text-sm flex items-center justify-between ${
          message.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="font-medium opacity-70 hover:opacity-100">Dismiss</button>
        </div>
      )}

      {/* Data Management Section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Data Management</h3>
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Clear All Data</h4>
              <p className="text-sm text-gray-500 mt-1 max-w-md">
                Permanently delete all campaigns, click records, install events, and active user data.
                This action cannot be undone.
              </p>
            </div>
            <button
              onClick={handleClearData}
              disabled={clearing}
              className="ml-6 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {clearing ? 'Clearing...' : 'Clear All Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
