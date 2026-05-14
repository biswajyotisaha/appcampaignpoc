import { DeepLinkPageContext } from './redirect.service';

/**
 * Escapes a string for safe HTML interpolation (prevents XSS).
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Renders a self-contained HTML interstitial page that:
 * - Android: Uses Intent URI for native app open with Play Store fallback
 * - iOS: Attempts custom URL scheme with App Store timeout fallback
 */
export function renderDeepLinkPage(context: DeepLinkPageContext): string {
  const campaignName = escapeHtml(context.campaignName);
  const device = escapeHtml(context.device);
  const iosDeepLink = context.iosDeepLink ? escapeHtml(context.iosDeepLink) : '';
  const iosStoreUrl = escapeHtml(context.iosStoreUrl);
  const androidIntentUri = context.androidIntentUri ? escapeHtml(context.androidIntentUri) : '';
  const androidStoreUrl = escapeHtml(context.androidStoreUrl);
  const storeName = context.device === 'ios' ? 'App Store' : 'Play Store';
  const storeUrl = context.device === 'ios' ? iosStoreUrl : androidStoreUrl;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Opening App...</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f9fafb;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      text-align: center;
      padding: 40px 24px;
      max-width: 360px;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e5e7eb;
      border-top-color: #4f46e5;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 24px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 8px;
    }
    #status {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 24px;
    }
    .store-link {
      display: none;
      color: #4f46e5;
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      padding: 10px 20px;
      border: 1px solid #4f46e5;
      border-radius: 8px;
      transition: background 0.2s;
    }
    .store-link:hover {
      background: #eef2ff;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <h1>Opening ${campaignName}...</h1>
    <p id="status">Checking if the app is installed...</p>
    <a id="store-link" class="store-link" href="${storeUrl}">
      Continue to ${storeName}
    </a>
  </div>

  <script>
    (function() {
      var device = '${device}';

      if (device === 'android') {
        // Android: Intent URI handles fallback natively
        window.location.href = '${androidIntentUri}';
        // Show manual fallback after 2s just in case
        setTimeout(function() {
          document.getElementById('status').textContent = 'If the app did not open:';
          document.getElementById('store-link').style.display = 'inline-block';
        }, 2000);

      } else if (device === 'ios') {
        var appUrl = '${iosDeepLink}';
        var storeUrl = '${iosStoreUrl}';
        var start = Date.now();

        // Attempt to open the app via custom scheme
        window.location.href = appUrl;

        // If still here after 1500ms, app likely not installed
        setTimeout(function() {
          if (document.hidden || document.webkitHidden) return;
          if (Date.now() - start > 3000) return;

          document.getElementById('status').textContent = 'App not found. Redirecting to store...';
          document.getElementById('store-link').style.display = 'inline-block';

          setTimeout(function() {
            window.location.href = storeUrl;
          }, 800);
        }, 1500);

        // If the app opens, page goes hidden — do nothing
        document.addEventListener('visibilitychange', function() {});
      }
    })();
  </script>
</body>
</html>`;
}
