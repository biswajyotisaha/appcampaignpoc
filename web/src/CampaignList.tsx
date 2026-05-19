import { useState } from 'react';
import { Campaign } from './api';

interface Props {
  campaigns: Campaign[];
  onDelete: (id: string) => void;
  onViewStats: (campaign: Campaign) => void;
}

export default function CampaignList({ campaigns, onDelete, onViewStats }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-16">
        <svg className="mx-auto w-12 h-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h3 className="text-base font-medium text-gray-900">No campaigns yet</h3>
        <p className="text-sm text-gray-500 mt-1">Create your first campaign to start tracking installs</p>
      </div>
    );
  }

  const copyLink = (campaign: Campaign) => {
    navigator.clipboard.writeText(campaign.trackingLink);
    setCopiedId(campaign.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const baseUrl = window.location.origin;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
        All Campaigns <span className="text-gray-400 font-normal">({campaigns.length})</span>
      </h3>

      <div className="grid gap-4">
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className="bg-white rounded-lg border border-gray-200 p-5 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{campaign.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">/{campaign.slug}</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                  {campaign.clickCount} clicks
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                  {campaign.installCount} installs
                </span>
              </div>
            </div>

            {/* Tracking Link */}
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 text-xs bg-[#f5f6fa] px-3 py-2 rounded border border-gray-200 text-gray-600 truncate">
                {campaign.trackingLink}
              </code>
              <button
                onClick={() => copyLink(campaign)}
                className="px-3 py-2 text-xs font-medium bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors whitespace-nowrap"
              >
                {copiedId === campaign.id ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Store URLs */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-gray-500">
                <span className="font-medium text-gray-600">iOS:</span>
                <span className="truncate">{campaign.iosUrl}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-500">
                <span className="font-medium text-gray-600">Android:</span>
                <span className="truncate">{campaign.androidUrl}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-500">
                <span className="font-medium text-gray-600">Fallback:</span>
                <span className="truncate">{campaign.fallbackUrl}</span>
              </div>
            </div>

            {/* Metadata */}
            {Object.keys(campaign.metadata).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {Object.entries(campaign.metadata).map(([key, value]) => (
                  <span
                    key={key}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-50 text-gray-600 border border-gray-200"
                  >
                    {key}: {value}
                  </span>
                ))}
              </div>
            )}

            {/* Integration Guide Toggle */}
            <div className="mt-3">
              <button
                onClick={() => setExpandedGuide(expandedGuide === campaign.id ? null : campaign.id)}
                className="text-xs font-medium text-[#4f86f7] hover:text-[#3a6dd6] transition-colors"
              >
                {expandedGuide === campaign.id ? 'Hide' : 'Show'} Integration Guide
              </button>

              {expandedGuide === campaign.id && (
                <div className="mt-2 bg-[#f5f6fa] rounded-lg border border-gray-200 p-4 text-xs">
                  <h4 className="font-semibold text-gray-900 mb-2">Mobile App Integration</h4>
                  <p className="text-gray-600 mb-3">
                    Call this endpoint from your app on every launch to retrieve campaign context.
                    The server automatically detects IP and User-Agent from headers. Pass your app's <strong>bundleId</strong> for per-app analytics.
                  </p>

                  <div className="mb-2 font-medium text-gray-700">Endpoint:</div>
                  <code className="block bg-white px-3 py-2 rounded border border-gray-200 text-gray-800 mb-3">
                    POST {baseUrl}/api/v1/attribution/match
                  </code>

                  <div className="mb-2 font-medium text-gray-700">JavaScript / React Native:</div>
                  <pre className="bg-white px-3 py-2 rounded border border-gray-200 text-gray-800 mb-3 overflow-x-auto">
{`fetch("${baseUrl}/api/v1/attribution/match", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ bundleId: "${campaign.deepLink?.androidPackage || 'com.example.myapp'}" })
})`}
                  </pre>

                  <div className="mb-2 font-medium text-gray-700">Swift (iOS):</div>
                  <pre className="bg-white px-3 py-2 rounded border border-gray-200 text-gray-800 mb-3 overflow-x-auto">
{`var request = URLRequest(url: URL(string: "${baseUrl}/api/v1/attribution/match")!)
request.httpMethod = "POST"
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
let body: [String: String] = ["bundleId": Bundle.main.bundleIdentifier ?? ""]
request.httpBody = try? JSONSerialization.data(withJSONObject: body)
let (data, _) = try await URLSession.shared.data(for: request)
let attribution = try JSONDecoder().decode(AttributionResponse.self, from: data)`}
                  </pre>

                  <div className="mb-2 font-medium text-gray-700">Kotlin (Android):</div>
                  <pre className="bg-white px-3 py-2 rounded border border-gray-200 text-gray-800 mb-3 overflow-x-auto">
{`val json = JSONObject().put("bundleId", context.packageName)
val body = json.toString().toRequestBody("application/json".toMediaType())
val request = Request.Builder()
    .url("${baseUrl}/api/v1/attribution/match")
    .post(body)
    .build()
OkHttpClient().newCall(request).execute()`}
                  </pre>

                  <div className="mb-2 font-medium text-gray-700">Response (when matched):</div>
                  <pre className="bg-white px-3 py-2 rounded border border-gray-200 text-gray-800 overflow-x-auto">
{`{
  "matched": true,
  "attribution": {
    "campaignId": "${campaign.id}",
    "campaignName": "${campaign.name}",
    "campaignSlug": "${campaign.slug}",
    "metadata": ${JSON.stringify(campaign.metadata, null, 4)},
    "clickedAt": "2026-05-13T10:30:00.000Z",
    "matchConfidence": "high",
    "matchMethod": "fingerprint"
  }
}`}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Created {new Date(campaign.createdAt).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onViewStats(campaign)}
                  className="text-xs text-[#4f86f7] hover:text-[#3a6dd6] font-medium transition-colors"
                >
                  View Stats
                </button>
                <button
                  onClick={() => onDelete(campaign.id)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
