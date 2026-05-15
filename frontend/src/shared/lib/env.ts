import Constants from 'expo-constants';

import { readPublicApiFromExtra, resolveRawApiBaseUrlFromParts } from './envResolve';

export { readPublicApiFromExtra, resolveRawApiBaseUrlFromParts } from './envResolve';

function fromExpoLinkedConfig(): string {
  const m2 = Constants.manifest2 as { extra?: { expoClient?: { extra?: unknown } } } | null;
  const manifest = Constants.manifest as { extra?: unknown } | null;
  return resolveRawApiBaseUrlFromParts(
    Constants.expoConfig?.extra,
    m2?.extra?.expoClient?.extra,
    manifest?.extra,
    undefined,
  );
}

function fromBundler(): string {
  if (typeof process.env.EXPO_PUBLIC_API_BASE_URL !== 'string') {
    return '';
  }
  return process.env.EXPO_PUBLIC_API_BASE_URL.trim();
}

function resolveRawApiBaseUrl(): string {
  const linked = fromExpoLinkedConfig();
  if (linked) {
    return linked;
  }
  return fromBundler();
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
