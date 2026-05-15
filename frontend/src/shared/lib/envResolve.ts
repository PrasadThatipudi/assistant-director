export function readPublicApiFromExtra(extra: unknown): string {
  if (!extra || typeof extra !== 'object') {
    return '';
  }
  const v = (extra as { publicApiBaseUrl?: unknown }).publicApiBaseUrl;
  return typeof v === 'string' ? v.trim() : '';
}

export function resolveRawApiBaseUrlFromParts(
  expoConfigExtra: unknown,
  manifest2ExpoClientExtra: unknown,
  manifestExtra: unknown,
  bundlerEnv: string | undefined,
): string {
  const fromExpo = readPublicApiFromExtra(expoConfigExtra);
  if (fromExpo) {
    return fromExpo;
  }
  const fromM2 = readPublicApiFromExtra(manifest2ExpoClientExtra);
  if (fromM2) {
    return fromM2;
  }
  const fromManifest = readPublicApiFromExtra(manifestExtra);
  if (fromManifest) {
    return fromManifest;
  }
  if (typeof bundlerEnv === 'string') {
    return bundlerEnv.trim();
  }
  return '';
}
