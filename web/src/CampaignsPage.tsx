import { useState, useEffect } from 'react';
import { Campaign, fetchCampaigns, createCampaign, deleteCampaign, CreateCampaignInput } from './api';
import CampaignForm from './CampaignForm';
import CampaignList from './CampaignList';
import CampaignChart from './CampaignChart';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartCampaign, setChartCampaign] = useState<Campaign | null>(null);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const data = await fetchCampaigns();
      setCampaigns(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleCreate = async (input: CreateCampaignInput) => {
    try {
      await createCampaign(input);
      setShowForm(false);
      await loadCampaigns();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await deleteCampaign(id);
      if (chartCampaign?.id === id) setChartCampaign(null);
      await loadCampaigns();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Campaigns</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage campaigns and track installs</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          {showForm ? 'Cancel' : '+ New Campaign'}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-medium">Dismiss</button>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="mb-8">
          <CampaignForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Analytics Chart */}
      {chartCampaign && (
        <div className="mb-8">
          <CampaignChart campaign={chartCampaign} onClose={() => setChartCampaign(null)} />
        </div>
      )}

      {/* Campaign List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading campaigns...</div>
      ) : (
        <CampaignList
          campaigns={campaigns}
          onDelete={handleDelete}
          onViewStats={(campaign) => setChartCampaign(campaign)}
        />
      )}
    </div>
  );
}
