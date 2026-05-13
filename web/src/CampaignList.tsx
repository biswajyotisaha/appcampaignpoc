import { useState } from 'react';
import { Campaign } from './api';

interface Props {
  campaigns: Campaign[];
  onDelete: (id: string) => void;
}

export default function CampaignList({ campaigns, onDelete }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">&#128640;</div>
        <h3 className="text-lg font-medium text-gray-900">No campaigns yet</h3>
        <p className="text-gray-500 mt-1">Create your first campaign to start tracking installs</p>
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
      <h2 className="text-lg font-semibold text-gray-900">
        Campaigns <span className="text-gray-400 font-normal">({campaigns.length})</span>
      </h2>

      <div className="grid gap-4">
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 truncate">{campaign.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5 font-mono">/{campaign.slug}</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {campaign.clickCount} clicks
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {campaign.installCount} installs
                </span>
              </div>
            </div>

            {/* Tracking Link */}
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 text-xs bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 truncate">
                {campaign.trackingLink}
              </code>
              <button
                onClick={() => copyLink(campaign)}
                className="px-3 py-2 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
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
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-indigo-50 text-indigo-700 border border-indigo-100"
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
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                {expandedGuide === campaign.id ? 'Hide' : 'Show'} Integration Guide
              </button>

              {expandedGuide === campaign.id && (
                <div className="mt-2 bg-gray-50 rounded-lg border border-gray-200 p-4 text-xs">
                  <h4 className="font-semibold text-gray-900 mb-2">Mobile App Integration</h4>
                  <p className="text-gray-600 mb-3">
                    Call this endpoint from your app on first launch to retrieve campaign context.
                    The server automatically detects the device's IP and User-Agent from the request headers — no manual setup needed.
                  </p>

                  <div className="mb-2 font-medium text-gray-700">Endpoint:</div>
                  <code className="block bg-white px-3 py-2 rounded border border-gray-200 text-gray-800 mb-3">
                    POST {baseUrl}/api/v1/attribution/match
                  </code>

                  <div className="mb-2 font-medium text-gray-700">Request (minimal — just call it, no body needed):</div>
                  <pre className="bg-white px-3 py-2 rounded border border-gray-200 text-gray-800 mb-3 overflow-x-auto">
{`fetch("${baseUrl}/api/v1/attribution/match", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({})
})`}
                  </pre>

                  <div className="mb-2 font-medium text-gray-700">Swift Example:</div>
                  <pre className="bg-white px-3 py-2 rounded border border-gray-200 text-gray-800 mb-3 overflow-x-auto">
{`var request = URLRequest(url: URL(string: "${baseUrl}/api/v1/attribution/match")!)
request.httpMethod = "POST"
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.httpBody = "{}".data(using: .utf8)
let (data, _) = try await URLSession.shared.data(for: request)
let attribution = try JSONDecoder().decode(AttributionResponse.self, from: data)`}
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
              <button
                onClick={() => onDelete(campaign.id)}
                className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
