export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  attributionWindowHours: parseInt(process.env.ATTRIBUTION_WINDOW_HOURS || '24', 10),
  confidenceThresholds: {
    high: 1,    // hours
    medium: 6,  // hours
    low: 24,    // hours (same as attribution window)
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,                  // requests per window
  },
};
