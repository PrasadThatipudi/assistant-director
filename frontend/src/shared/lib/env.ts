import Constants from 'expo-constants';

function readPublicApiFromExtra(extra: unknown): string {
  if (!extra || typeof extra !== 'object') {
    return '';
  }
  const v = (extra as { publicApiBaseUrl?: unknown }).publicApiBaseUrl;
  return typeof v === 'string' ? v.trim() : '';
}

function fromExpoLinkedConfig(): string {
  const fromExpoConfig = readPublicApiFromExtra(Constants.expoConfig?.extra);
  if (fromExpoConfig) {
    return fromExpoConfig;
  }
  const m2 = Constants.manifest2 as { extra?: { expoClient?: { extra?: unknown } } } | null;
  const fromM2 = readPublicApiFromExtra(m2?.extra?.expoClient?.extra);
  if (fromM2) {
    return fromM2;
  }
  const manifest = Constants.manifest as { extra?: unknown } | null;
  return readPublicApiFromExtra(manifest?.extra);
}

function fromBundler(): string {
  if (typeof process.env.EXPO_PUBLIC_API_BASE_URL !== 'string') {
    return '';
  }
  return process.env.EXPO_PUBLIC_API_BASE_URL.trim();
}

function resolveRawApiBaseUrl(): string {
  return fromExpoLinkedConfig() || fromBundler();
}

export function getApiBaseUrl(): string {
  return resolveRawApiBaseUrl().replace(/\/+$/, '');
}

export function getApiBaseUrlDiagnostics(): {
  expoConfigIsNull: boolean;
  expoConfigExtraLen: number;
  manifestExtraLen: number;
  manifest2ExpoClientExtraLen: number;
  bundlerEnvLen: number;
  resolvedLen: number;
} {
  const m2 = Constants.manifest2 as { extra?: { expoClient?: { extra?: unknown } } } | null;
  const manifest = Constants.manifest as { extra?: unknown } | null;
  const raw = resolveRawApiBaseUrl();
  return {
    expoConfigIsNull: Constants.expoConfig == null,
    expoConfigExtraLen: readPublicApiFromExtra(Constants.expoConfig?.extra).length,
    manifestExtraLen: readPublicApiFromExtra(manifest?.extra).length,
    manifest2ExpoClientExtraLen: readPublicApiFromExtra(m2?.extra?.expoClient?.extra).length,
    bundlerEnvLen: fromBundler().length,
    resolvedLen: raw.length,
  };
}
