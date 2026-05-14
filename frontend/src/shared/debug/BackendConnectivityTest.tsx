import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { getApiBaseUrl } from '../lib/env';

export function BackendConnectivityTest() {
  const [testing, setTesting] = useState(false);
  const [lastResult, setLastResult] = useState<string>('');

  const testConnectivity = async () => {
    setTesting(true);
    setLastResult('Testing...');
    
    const base = getApiBaseUrl();
    
    if (!base) {
      setLastResult('❌ No API base URL configured');
      setTesting(false);
      return;
    }

    console.log('[ConnectivityTest] Testing backend connectivity to:', base);

    try {
      // Test 1: Health endpoint
      console.log('[ConnectivityTest] Testing health endpoint...');
      const healthResponse = await fetch(`${base}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.text();
        console.log('[ConnectivityTest] Health check successful:', healthData);
        setLastResult(`✅ Health: ${healthResponse.status} - ${healthData.substring(0, 50)}`);
      } else {
        console.log('[ConnectivityTest] Health check failed:', healthResponse.status);
        setLastResult(`❌ Health failed: ${healthResponse.status}`);
        setTesting(false);
        return;
      }

      // Test 2: Users endpoint (registration)
      console.log('[ConnectivityTest] Testing user registration endpoint...');
      const email = `test-${Date.now()}@connectivity.test`;
      const userResponse = await fetch(`${base}/v1/users`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ email }),
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log('[ConnectivityTest] User registration successful:', userData);
        setLastResult(prev => `${prev}\n✅ Registration: ${userResponse.status} - User created`);
      } else {
        const userError = await userResponse.text();
        console.log('[ConnectivityTest] User registration failed:', userResponse.status, userError);
        setLastResult(prev => `${prev}\n❌ Registration failed: ${userResponse.status} - ${userError.substring(0, 50)}`);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[ConnectivityTest] Network error:', errorMsg);
      setLastResult(`❌ Network Error: ${errorMsg}`);
    }

    setTesting(false);
  };

  const showResults = () => {
    if (lastResult) {
      Alert.alert('Connectivity Test Results', lastResult, [{ text: 'OK' }]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Backend Connectivity Test</Text>
      <Text style={styles.url}>API: {getApiBaseUrl() || 'Not configured'}</Text>
      
      <Pressable 
        style={[styles.button, testing && styles.buttonDisabled]} 
        onPress={testConnectivity}
        disabled={testing}
      >
        <Text style={styles.buttonText}>
          {testing ? 'Testing...' : 'Test Connection'}
        </Text>
      </Pressable>
      
      {lastResult ? (
        <Pressable style={styles.resultButton} onPress={showResults}>
          <Text style={styles.resultText} numberOfLines={3}>
            {lastResult}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    margin: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  url: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  resultButton: {
    backgroundColor: '#e8e8e8',
    padding: 8,
    borderRadius: 4,
  },
  resultText: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
});