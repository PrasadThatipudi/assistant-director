# Network Setup Instructions

## Issue Found
Your device cannot connect to the backend because of network configuration issues.

## What I've Fixed
1. **Updated `.env` file**: Changed `EXPO_PUBLIC_API_BASE_URL` from `http://192.168.1.50:8000` to `http://127.0.0.1:8000`
2. **Verified backend is running**: Backend is accessible at `http://127.0.0.1:8000/health`

## Required Actions

### 1. Restart Metro (REQUIRED)
Metro must be restarted after `.env` changes:
```bash
# Stop current Metro (Ctrl+C in the terminal)
# Then restart:
npm run start:frontend
```

### 2. Ensure Backend is Bound Correctly
Your backend MUST be started with `--host 0.0.0.0` to accept connections from devices/simulators:
```bash
# Stop current backend if running
# Start with correct binding:
npm run backend:start
```

### 3. Choose Correct Configuration Based on Your Device

**If you're using iOS Simulator:**
- Current config `http://127.0.0.1:8000` should work

**If you're using Android Emulator:**
- Change to `http://10.0.2.2:8000` in `.env`

**If you're using a Physical Device:**
- Find your Mac's LAN IP: `ipconfig getifaddr en0`
- Update `.env` to use `http://[YOUR_MAC_IP]:8000`
- Ensure your device and Mac are on the same Wi-Fi network

## Testing
After restarting Metro, try creating a project again. The debug logs will show if the connection is working:
- Look for `[Auth] Registration successful` in Metro console
- The connectivity test component in the app can also verify backend access

## Troubleshooting
If still failing:
1. Verify backend is running: `curl http://127.0.0.1:8000/health`
2. Check Metro picked up the new .env: Look for the new URL in logs
3. Try the connectivity test in the app (development mode only)
