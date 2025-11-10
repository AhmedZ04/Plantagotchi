# Android Device Setup Guide

## Quick Answer: Do You Need Port Forwarding?

**For Wi‑Fi Connection (Expo Go):** No, port forwarding is NOT needed if:
- ✅ Device and computer are on the same Wi‑Fi network
- ✅ Mock server is running and bound to `0.0.0.0` (already configured)
- ✅ Firewall allows connections on port 4000

**For USB Connection or Network Issues:** Yes, ADB port forwarding can help.

## Option 1: Wi‑Fi Connection (Recommended - No Port Forwarding Needed)

### Setup Steps:

1. **Ensure device and computer are on the same Wi‑Fi network**

2. **Start the mock server:**
   ```bash
   cd mock-server
   npm run server
   ```
   Should show: `✅ Mock sensor server running on http://0.0.0.0:4000`

3. **Start Expo:**
   ```bash
   cd plant-whisperer
   npm start
   ```

4. **Open app on Android device:**
   - Scan QR code with Expo Go app
   - Or press 'a' in the Expo terminal

5. **The app will automatically:**
   - Detect your computer's IP address from Expo
   - Connect to `ws://YOUR_COMPUTER_IP:4000/ws`
   - You'll see in logs: `Using development machine IP for WebSocket: ws://10.80.232.168:4000/ws`

### Troubleshooting Wi‑Fi Connection:

**If connection fails, check:**

1. **Same network:** Device and computer must be on the same Wi‑Fi
   ```bash
   # On computer, check your IP:
   # Windows: ipconfig
   # Mac/Linux: ifconfig or ip addr
   
   # The IP shown in Expo (e.g., 10.80.232.168) should match your computer's Wi‑Fi IP
   ```

2. **Server accessibility:** Test from device's browser
   - Open browser on Android device
   - Go to: `http://10.80.232.168:4000/health`
   - Should show: `{"ok": true}`
   - If this doesn't work, the server isn't accessible

3. **Firewall:** Windows Firewall might be blocking port 4000
   ```bash
   # Windows: Allow port 4000 in Windows Firewall
   # Control Panel → Windows Defender Firewall → Advanced Settings
   # → Inbound Rules → New Rule → Port → TCP → 4000 → Allow
   ```

4. **Server binding:** Make sure server binds to `0.0.0.0` (already configured)
   - Check `mock-server/server.ts` line 165: `server.listen(PORT, '0.0.0.0', ...)`

## Option 2: USB Connection with ADB Port Forwarding

If Wi‑Fi connection doesn't work, you can use USB + ADB port forwarding:

### Setup Steps:

1. **Enable USB Debugging on Android device:**
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"

2. **Connect device via USB**

3. **Install ADB (if not already installed):**
   ```bash
   # Windows: Download from https://developer.android.com/studio/releases/platform-tools
   # Or if you have Android Studio, ADB is included
   
   # Verify ADB is installed:
   adb version
   ```

4. **Forward port 4000:**
   ```bash
   adb reverse tcp:4000 tcp:4000
   ```
   This forwards device's port 4000 → computer's port 4000

5. **Verify port forwarding:**
   ```bash
   adb reverse --list
   # Should show: tcp:4000 tcp:4000
   ```

6. **Update app to use localhost:**
   Since we're forwarding, the device will see `localhost:4000` as the computer's port 4000.
   
   However, our current code should work because:
   - For Android, it tries to detect the IP from Expo
   - If that fails, it falls back to `10.0.2.2` (emulator)
   - With ADB forwarding, we might need to use `localhost` instead

7. **Start mock server (on localhost):**
   ```bash
   cd mock-server
   npm run server
   ```

8. **Test connection:**
   - Open browser on Android device
   - Go to: `http://localhost:4000/health`
   - Should show: `{"ok": true}`

### If Using ADB Forwarding, You May Need to Modify the Code:

If ADB port forwarding is working, you might need to update the WebSocket URL to use `localhost` for USB connections. However, this is usually not necessary if Wi‑Fi works.

## Option 3: Manual IP Configuration

If auto-detection doesn't work, you can manually set the IP:

1. **Find your computer's IP address:**
   ```bash
   # Windows:
   ipconfig
   # Look for "IPv4 Address" under your Wi‑Fi adapter
   
   # Mac/Linux:
   ifconfig
   # Or: ip addr show
   ```

2. **Manually set in code (temporary for testing):**
   Edit `src/hooks/usePlantState.ts` and hardcode the IP:
   ```typescript
   const wsUrl = 'ws://YOUR_IP_HERE:4000/ws';
   ```

## Checking Connection Status

The app shows connection status in the UI:
- **Connected** (green): WebSocket is connected and receiving data
- **Connecting** (yellow): Attempting to connect
- **Error** (red): Connection failed - check server and network
- **Disconnected** (gray): Not connected

Check the Expo console for detailed logs:
- `Using development machine IP for WebSocket: ws://...`
- `WebSocket connected to ws://...`
- `WebSocket connection failed (code 1006)...`

## Common Issues

### Issue: "Connection failed (code 1006)"
**Solution:** 
- Check server is running: `http://localhost:4000/health`
- Check device can access server: `http://YOUR_IP:4000/health` from device browser
- Check firewall allows port 4000
- Ensure same Wi‑Fi network

### Issue: "Blank screen on Android"
**Solution:**
- Check Expo console for JavaScript errors
- Check Android logs: `adb logcat | grep -i error`
- Try reloading: Press 'r' in Expo terminal or shake device → Reload

### Issue: "Server not accessible from device"
**Solution:**
- Verify server binds to `0.0.0.0` (not `127.0.0.1`)
- Check Windows Firewall allows port 4000
- Try ADB port forwarding as fallback
- Check router doesn't have AP isolation enabled

## Recommended Approach

1. **Start with Wi‑Fi connection** (no port forwarding needed)
2. **Test server accessibility** from device browser
3. **If that fails, try ADB port forwarding** as fallback
4. **Check connection status** in the app UI

The app is already configured to auto-detect the IP address, so Wi‑Fi connection should work without any port forwarding in most cases.

