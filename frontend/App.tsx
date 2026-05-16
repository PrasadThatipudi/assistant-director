import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, Pressable, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ensureApiUser } from './src/data/auth/session';
import { migrateLegacyFromAsyncStorage } from './src/data/db/migrateLegacyAsyncStorage';
import { openAssistantDatabase } from './src/data/db/openDatabase';
import { runMigrations } from './src/data/db/migrations';
import { flushOutbox } from './src/data/sync/outboxFlush';
import { RootNavigator } from './src/shell/RootNavigator';
import { BootstrapContext, type BootstrapState } from './src/shared/context/BootstrapContext';

export default function App() {
  const [ready, setReady] = useState(false);
  const [bootstrapState, setBootstrapState] = useState<BootstrapState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const runBootstrap = async (manualRetry = false) => {
    try {
      console.log('[App] Starting bootstrap process...', { manualRetry });
      setBootstrapState(manualRetry ? 'retrying' : 'loading');
      setErrorMessage('');

      // #region agent log
      const { getApiBaseUrlDiagnostics } = await import('./src/shared/lib/env');
      const diag = getApiBaseUrlDiagnostics();
      fetch('http://127.0.0.1:7573/ingest/a4a749da-e3a0-4f3c-a932-73e321747efb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'b61b79' },
        body: JSON.stringify({
          sessionId: 'b61b79',
          runId: 'post-fix',
          hypothesisId: 'H4',
          location: 'App.tsx:runBootstrap',
          message: 'bootstrap_start_api_diag',
          data: { manualRetry, ...diag },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      const db = openAssistantDatabase();
      console.log('[App] Database opened');

      runMigrations(db);
      console.log('[App] Migrations completed');

      // Use 3 retries for automatic attempts, 1 for manual retries
      const maxRetries = manualRetry ? 1 : 3;
      const userId = await ensureApiUser(db, maxRetries);
      console.log('[App] User ensured:', userId?.substring(0, 8) + '...');

      await migrateLegacyFromAsyncStorage(db, userId);
      console.log('[App] Legacy migration completed');

      await flushOutbox(db);
      console.log('[App] Outbox flushed');

      console.log('[App] Bootstrap completed successfully');

      // Determine final state based on user ID
      const isOfflineMode = userId === '00000000-0000-4000-8000-000000000001';
      setBootstrapState(isOfflineMode ? 'offline' : 'success');
      setReady(true);

    } catch (error) {
      console.warn('[App] Bootstrap failed:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isUserRegisterNetwork = errorMsg.includes('USER_REGISTER_NETWORK');
      // #region agent log
      fetch('http://127.0.0.1:7573/ingest/a4a749da-e3a0-4f3c-a932-73e321747efb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'b61b79' },
        body: JSON.stringify({
          sessionId: 'b61b79',
          runId: 'post-fix',
          hypothesisId: 'H2',
          location: 'App.tsx:catch',
          message: 'bootstrap_catch_branch',
          data: {
            errorMsgPrefix: errorMsg.slice(0, 120),
            isUserRegisterNetwork,
            branch: isUserRegisterNetwork ? 'failed_no_ready' : 'offline_ready',
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      if (isUserRegisterNetwork) {
        // Network error - allow retry
        setErrorMessage('Cannot connect to server. Check your internet connection and ensure the backend is running.');
        setBootstrapState('failed');
      } else {
        // Other error - still allow offline mode
        console.log('[App] Non-network error, falling back to offline mode');
        setBootstrapState('offline');
        setReady(true);
      }
    }
  };

  useEffect(() => {
    void runBootstrap();
  }, []);

  if (!ready) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>
          {bootstrapState === 'loading' && 'Starting app...'}
          {bootstrapState === 'retrying' && 'Retrying connection...'}
          {bootstrapState === 'failed' && 'Connection failed'}
        </Text>

        {bootstrapState === 'failed' && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => runBootstrap(true)}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
            <Pressable
              style={styles.offlineButton}
              onPress={() => {
                setBootstrapState('offline');
                setReady(true);
              }}
            >
              <Text style={styles.offlineButtonText}>Continue Offline</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  const bootstrapContextValue = {
    bootstrapState,
    isBootstrapComplete: bootstrapState === 'success' || bootstrapState === 'offline',
    canPerformOperations: bootstrapState === 'success' || bootstrapState === 'offline',
    isOfflineMode: bootstrapState === 'offline',
  };

  return (
    <BootstrapContext.Provider value={bootstrapContextValue}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </SafeAreaProvider>
    </BootstrapContext.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  offlineButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  offlineButtonText: {
    color: '#007AFF',
    fontSize: 14,
  },
});
