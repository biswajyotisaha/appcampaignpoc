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

  // Deep link fields
  const [showDeepLink, setShowDeepLink] = useState(false);
  const [iosScheme, setIosScheme] = useState('');
  const [androidPackage, setAndroidPackage] = useState('');
  const [deepLinkPath, setDeepLinkPath] = useState('');

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

    const input: CreateCampaignInput = { name, slug, iosUrl, androidUrl, fallbackUrl, metadata };

    // Include deepLink only if at least one field is filled
    if (iosScheme.trim() || androidPackage.trim() || deepLinkPath.trim()) {
      input.deepLink = {};
      if (iosScheme.trim()) input.deepLink.iosScheme = iosScheme.trim();
      if (androidPackage.trim()) input.deepLink.androidPackage = androidPackage.trim();
      if (deepLinkPath.trim()) input.deepLink.deepLinkPath = deepLinkPath.trim();
    }

    onSubmit(input);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Create New Campaign</h2>

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
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-[#1a1f36] focus:border-[#1a1f36] outline-none"
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
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-[#1a1f36] focus:border-[#1a1f36] outline-none font-mono"
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
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-[#1a1f36] focus:border-[#1a1f36] outline-none"
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
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-[#1a1f36] focus:border-[#1a1f36] outline-none"
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
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-[#1a1f36] focus:border-[#1a1f36] outline-none"
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
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-[#1a1f36] focus:border-[#1a1f36] outline-none"
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
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-[#1a1f36] focus:border-[#1a1f36] outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">Optional. Campaign topic for categorization</p>
        </div>
      </div>

      {/* Deep Link Section */}
      <div className="mt-6 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={() => setShowDeepLink(!showDeepLink)}
          className="flex items-center gap-2 text-sm font-medium text-[#4f86f7] hover:text-[#3a6dd6]"
        >
          <svg className={`w-4 h-4 transition-transform ${showDeepLink ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Deep Linking (Optional)
        </button>
        <p className="text-xs text-gray-400 mt-1">Open the app directly if installed, otherwise redirect to store</p>

        {showDeepLink && (
          <div className="mt-4 space-y-4">
            {/* Setup Instructions */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-indigo-900 mb-2">Setup Instructions</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-indigo-800 mb-1">iOS — Register scheme in Info.plist:</p>
                  <pre className="text-xs bg-white border border-indigo-100 rounded p-2 overflow-x-auto text-gray-700">
{`<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>your-scheme</string>
    </array>
  </dict>
</array>`}
                  </pre>
                </div>
                <div>
                  <p className="text-xs font-medium text-indigo-800 mb-1">Android — Add intent filter in AndroidManifest.xml:</p>
                  <pre className="text-xs bg-white border border-indigo-100 rounded p-2 overflow-x-auto text-gray-700">
{`<activity android:name=".MainActivity">
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="your-package-name" />
  </intent-filter>
</activity>`}
                  </pre>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* iOS Scheme */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">iOS URL Scheme</label>
                <input
                  type="text"
                  value={iosScheme}
                  onChange={(e) => setIosScheme(e.target.value)}
                  placeholder="e.g., myapp"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-[#1a1f36] focus:border-[#1a1f36] outline-none font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">The CFBundleURLSchemes value from your Info.plist</p>
              </div>

              {/* Android Package */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Android Package Name</label>
                <input
                  type="text"
                  value={androidPackage}
                  onChange={(e) => setAndroidPackage(e.target.value)}
                  placeholder="e.g., com.company.myapp"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-[#1a1f36] focus:border-[#1a1f36] outline-none font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">The android:scheme value from your AndroidManifest.xml</p>
              </div>

              {/* Deep Link Path */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Deep Link Path</label>
                <input
                  type="text"
                  value={deepLinkPath}
                  onChange={(e) => setDeepLinkPath(e.target.value)}
                  placeholder="/campaign/{slug}"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-[#1a1f36] focus:border-[#1a1f36] outline-none font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">Path inside the app. Use {'{slug}'} as a placeholder for the campaign slug. Default: /campaign/{'{slug}'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
        <button
          type="submit"
          className="px-4 py-2 bg-[#1a1f36] text-white text-sm font-medium rounded-md hover:bg-[#2d3354] transition-colors"
        >
          Create Campaign
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
