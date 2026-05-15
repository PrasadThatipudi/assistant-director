const API_REACHABILITY_TIMEOUT_MS = 5_000;

export async function checkApiReachable(base: string, auth: string): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_REACHABILITY_TIMEOUT_MS);
  try {
    const response = await fetch(`${base}/docs`, {
      method: 'GET',
      headers: { Authorization: auth, Accept: 'text/html' },
      signal: controller.signal,
    });
    if (response.status >= 500) {
      throw new Error('SCRIPT_UPLOAD_UNREACHABLE: server error');
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('SCRIPT_UPLOAD_UNREACHABLE: connection timed out');
    }
    if (error instanceof Error && error.message.startsWith('SCRIPT_UPLOAD_UNREACHABLE:')) {
      throw error;
    }
    throw new Error('SCRIPT_UPLOAD_UNREACHABLE: cannot reach API');
  } finally {
    clearTimeout(timeoutId);
  }
}
