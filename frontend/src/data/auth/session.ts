import type { SQLiteDatabase } from 'expo-sqlite';

import { getApiBaseUrl } from '../../shared/lib/env';

const OFFLINE_OWNER_ID = '00000000-0000-4000-8000-000000000001';

export function getStoredUserId(db: SQLiteDatabase): string | null {
  const row = db.getFirstSync<{ v: string }>('SELECT v FROM meta WHERE k = ?', 'api_user_id');
  return row?.v ?? null;
}

async function attemptUserRegistration(base: string, retryCount: number): Promise<string> {
  const email = `device-${Date.now()}@local.invalid`;
  console.log('[Auth] Attempting user registration:', { 
    email, 
    endpoint: `${base}/v1/users`,
    retryCount 
  });
  
  let res: Response;
  try {
    res = await fetch(`${base}/v1/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email }),
    });
    console.log('[Auth] Registration response:', { status: res.status, ok: res.ok });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.warn('[Auth] Registration network error:', detail);
    throw new Error(`USER_REGISTER_NETWORK: ${detail}`);
  }
  
  if (!res.ok) {
    const errorText = await res.text();
    console.log('[Auth] Registration failed with status:', res.status, errorText);
    throw new Error(`USER_REGISTER_HTTP: ${res.status} ${errorText}`);
  }
  
  const body = (await res.json()) as { id: string };
  console.log('[Auth] Registration successful, user ID:', body.id.substring(0, 8) + '...');
  return body.id;
}

export async function ensureApiUser(db: SQLiteDatabase, maxRetries = 3): Promise<string> {
  console.log('[Auth] Starting ensureApiUser...', { maxRetries });
  const existing = getStoredUserId(db);
  const base = getApiBaseUrl();
  
  console.log('[Auth] Current state:', {
    hasExistingUser: !!existing,
    existingUserId: existing?.substring(0, 8) + '...',
    isOfflineId: existing === OFFLINE_OWNER_ID,
    hasApiBase: !!base,
    apiBase: base
  });

  if (existing && existing !== OFFLINE_OWNER_ID) {
    console.log('[Auth] Using existing valid user ID');
    return existing;
  }

  if (!base) {
    console.log('[Auth] No API base URL, using offline mode');
    db.runSync('INSERT OR REPLACE INTO meta (k, v) VALUES (?, ?)', ['api_user_id', OFFLINE_OWNER_ID]);
    return OFFLINE_OWNER_ID;
  }

  // Attempt registration with retries
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const userId = await attemptUserRegistration(base, attempt);
      db.runSync('INSERT OR REPLACE INTO meta (k, v) VALUES (?, ?)', ['api_user_id', userId]);
      return userId;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log('[Auth] Registration attempt failed:', { 
        attempt: attempt + 1, 
        maxRetries, 
        error: lastError.message 
      });
      
      // If this was the last attempt, don't wait
      if (attempt < maxRetries - 1) {
        // Progressive backoff: 1s, 2s, 4s, etc.
        const delayMs = Math.pow(2, attempt) * 1000;
        console.log('[Auth] Waiting before retry:', delayMs, 'ms');
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  // All retries failed — use offline mode for HTTP or network (retries already exhausted).
  console.warn('[Auth] All registration attempts failed, last error:', lastError?.message);

  if (lastError?.message.includes('USER_REGISTER_HTTP')) {
    console.log('[Auth] HTTP error, falling back to offline mode');
  } else {
    console.log('[Auth] Network error after retries, falling back to offline mode');
  }

  // #region agent log
  fetch('http://127.0.0.1:7573/ingest/a4a749da-e3a0-4f3c-a932-73e321747efb', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'b61b79' },
    body: JSON.stringify({
      sessionId: 'b61b79',
      runId: 'post-fix',
      hypothesisId: 'H1',
      location: 'session.ts:ensureApiUser',
      message: 'offline_fallback_after_retries',
      data: {
        lastErrorPrefix: (lastError?.message ?? '').slice(0, 160),
        wasHttp: !!lastError?.message.includes('USER_REGISTER_HTTP'),
        wasNetwork: !!lastError?.message.includes('USER_REGISTER_NETWORK'),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  db.runSync('INSERT OR REPLACE INTO meta (k, v) VALUES (?, ?)', ['api_user_id', OFFLINE_OWNER_ID]);
  return OFFLINE_OWNER_ID;
}

export function authorizationHeader(db: SQLiteDatabase): string | null {
  const id = getStoredUserId(db);
  if (!id) {
    return null;
  }
  return `Bearer ${id}`;
}
