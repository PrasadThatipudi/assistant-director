const path = require('path');

const rootEnv = path.join(__dirname, '..', '.env');
const appEnv = path.join(__dirname, '.env');

require('dotenv').config({ path: rootEnv });
require('dotenv').config({ path: appEnv, override: true });

module.exports = ({ config }) => {
  const raw = process.env.EXPO_PUBLIC_API_BASE_URL;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';

  return {
    ...config,
    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios?.infoPlist,
        NSAppTransportSecurity: {
          ...config.ios?.infoPlist?.NSAppTransportSecurity,
          NSAllowsLocalNetworking: true,
        },
      },
    },
    android: {
      ...config.android,
      usesCleartextTraffic: true,
    },
    extra: {
      ...(typeof config.extra === 'object' && config.extra !== null ? config.extra : {}),
      publicApiBaseUrl: trimmed,
    },
  };
};
