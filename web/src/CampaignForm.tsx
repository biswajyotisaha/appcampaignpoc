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
  const [source, setSource] = useState('');
  const [topic, setTopic] = useState('');

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate slug from name
    const autoSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setSlug(autoSlug);
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const metadata: Record<string, string> = {};
    if (source.trim()) metadata.source = source.trim();
    if (topic.trim()) metadata.topic = topic.trim();

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

        {/* Source */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="e.g., facebook, google, email"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">Optional. Traffic source for attribution</p>
        </div>

        {/* Topic */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., sleep, diabetes, wellness"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">Optional. Campaign topic for categorization</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
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
