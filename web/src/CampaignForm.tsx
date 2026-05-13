import { useState } from 'react';
import { CreateCampaignInput } from './api';

interface Props {
  onSubmit: (input: CreateCampaignInput) => void;
  onCancel: () => void;
}

export default function CampaignForm({ onSubmit, onCancel }: Props) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [iosUrl, setIosUrl] = useState('');
  const [androidUrl, setAndroidUrl] = useState('');
  const [fallbackUrl, setFallbackUrl] = useState('');
  const [metadataStr, setMetadataStr] = useState('');
  const [metadataError, setMetadataError] = useState<string | null>(null);

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate slug from name
    const autoSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setSlug(autoSlug);
  };

  const validateMetadata = (value: string) => {
    setMetadataStr(value);
    if (!value.trim()) {
      setMetadataError(null);
      return;
    }
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setMetadataError('Must be a JSON object (e.g., {"key": "value"})');
        return;
      }
      // Check all values are strings
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v !== 'string') {
          setMetadataError(`Value for "${k}" must be a string`);
          return;
        }
      }
      setMetadataError(null);
    } catch {
      setMetadataError('Invalid JSON syntax');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let metadata: Record<string, string> = {};
    if (metadataStr.trim()) {
      if (metadataError) return; // Block submit if invalid
      metadata = JSON.parse(metadataStr);
    }

    onSubmit({ name, slug, iosUrl, androidUrl, fallbackUrl, metadata });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Campaign</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g., Sleep Wellness Q3"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g., sleep-wellness-q3"
            pattern="[a-z0-9-]+"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono"
          />
          <p className="text-xs text-gray-400 mt-1">Lowercase letters, numbers, hyphens only</p>
        </div>

        {/* iOS URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">App Store URL (iOS)</label>
          <input
            type="url"
            required
            value={iosUrl}
            onChange={(e) => setIosUrl(e.target.value)}
            placeholder="https://apps.apple.com/app/id123456"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        {/* Android URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Play Store URL (Android)</label>
          <input
            type="url"
            required
            value={androidUrl}
            onChange={(e) => setAndroidUrl(e.target.value)}
            placeholder="https://play.google.com/store/apps/details?id=com.example"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        {/* Fallback URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fallback URL (Desktop/Other)</label>
          <input
            type="url"
            required
            value={fallbackUrl}
            onChange={(e) => setFallbackUrl(e.target.value)}
            placeholder="https://example.com/landing"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        {/* Metadata */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Metadata (JSON)</label>
          <textarea
            value={metadataStr}
            onChange={(e) => validateMetadata(e.target.value)}
            placeholder={'{\n  "source": "facebook",\n  "topic": "sleep"\n}'}
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono resize-none ${
              metadataError ? 'border-red-400 bg-red-50' : 'border-gray-300'
            }`}
          />
          {metadataError ? (
            <p className="text-xs text-red-500 mt-1">{metadataError}</p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">Optional. Key-value pairs passed to the app on attribution</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
        <button
          type="submit"
          disabled={!!metadataError}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Campaign
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
