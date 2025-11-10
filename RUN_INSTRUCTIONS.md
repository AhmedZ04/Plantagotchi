# 🚀 How to Run the Plant Whisperer App

## Prerequisites

- Node.js installed (v18 or later)
- Expo CLI installed globally: `npm install -g expo-cli`
- Android device/emulator OR iOS simulator (for testing)
- Mock server dependencies installed

---

## Step 1: Start the Mock Sensor Server

The mock server simulates sensor data and must be running before the app connects.

### Terminal 1: Start Mock Server

```bash
# Navigate to mock-server directory
cd mock-server

# Install dependencies (first time only)
npm install

# Start the server
npm run server
```

**Expected Output:**
```
✅ Mock sensor server running on http://0.0.0.0:4000
   Accessible at http://localhost:4000
   Android emulator: ws://10.0.2.2:4000/ws
   WebSocket server available at ws://localhost:4000/ws
Auto-started sensor streaming (1000ms interval)
```

**Keep this terminal open!** The server must keep running.

---

## Step 2: Start the React Native App

### Terminal 2: Start Expo

```bash
# Navigate to plant-whisperer directory
cd plant-whisperer

# Install dependencies (first time only)
npm install

# Start Expo
npm start
```

**Expected Output:**
```
› Metro waiting on exp://YOUR_IP:8082
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

---

## Step 3: Connect Your Device

### Option A: Android Emulator

1. **Start Android Emulator** (Android Studio → AVD Manager)
2. **In Expo terminal, press `a`** to open on Android
3. The app should connect automatically to `ws://10.0.2.2:4000/ws`

### Option B: Physical Android Device (WiFi)

1. **Ensure device and computer are on the same WiFi network**
2. **Install Expo Go** from Google Play Store
3. **Scan the QR code** shown in Expo terminal
4. The app will auto-detect your computer's IP and connect

**Check Expo console for:**
```
🌐 Using WiFi connection - Development machine IP: ws://YOUR_IP:4000/ws
WebSocket connected to ws://YOUR_IP:4000/ws
Requested sensor data streaming (1000ms interval)
```

### Option C: Physical Android Device (Phone Hotspot)

If WiFi doesn't work, use phone hotspot:

1. **Turn on phone hotspot**
2. **Connect computer to phone hotspot**
3. **Find computer's IP on hotspot network:**
   - Windows: `ipconfig` → Look for hotspot adapter IP
   - Mac/Linux: `ifconfig` → Look for hotspot adapter IP
4. **Manually set IP in code** (temporary):
   - Edit `plant-whisperer/src/hooks/usePlantState.ts`
   - Around line 235, change:
     ```typescript
     let wsUrl = 'ws://YOUR_COMPUTER_IP_HERE:4000/ws';
     ```
   - Replace `YOUR_COMPUTER_IP_HERE` with the IP from step 3
5. **Restart Expo** (press `r` to reload)

### Option D: iOS Simulator (Mac only)

1. **In Expo terminal, press `i`** to open on iOS simulator
2. The app will connect to `ws://localhost:4000/ws`

### Option E: Web Browser

1. **In Expo terminal, press `w`** to open in web browser
2. The app will connect to `ws://localhost:4000/ws`

---

## Step 4: Verify Everything is Working

### Check Connection Status

1. **Look at the app screen** - You should see a connection status pill:
   - 🟢 **Green "Connected"** = Working!
   - 🟡 **Yellow "Connecting..."** = Still connecting (wait a few seconds)
   - 🔴 **Red "Error"** = Connection failed (see troubleshooting)

### Check Health Bars

1. **Health bars should show values** (0-100%)
2. **Values should update every second** (sensor data streaming)
3. **Labels should show:**
   - Hydration
   - Comfort
   - Air Quality
   - Bio Link

### Check Plant Avatar

1. **Emotion state should be displayed** (e.g., "I_FEEL_GREAT", "I_AM_OKAY")
2. **Should update when sensor values change**

### Check Event Log

1. **Recent Activity section** should show emotion changes
2. **Events appear when emotion state changes**

### Check Console Logs

**In Expo terminal, you should see:**
```
WebSocket connected to ws://...
Requested sensor data streaming (1000ms interval)
```

**In Mock Server terminal, you should see:**
```
Client connected
Auto-started sensor streaming (1000ms interval)
```

---

## Troubleshooting

### Issue: "Connection Error" or Status is Red

**Solutions:**

1. **Check mock server is running:**
   ```bash
   # In browser or terminal, test:
   curl http://localhost:4000/health
   # Should return: {"ok": true}
   ```

2. **Check port 4000 is free:**
   ```bash
   # Windows:
   netstat -ano | findstr :4000
   
   # Mac/Linux:
   lsof -i :4000
   ```
   If port is in use, kill the process or change port in `mock-server/server.ts`

3. **Check firewall:**
   - Windows Firewall might be blocking port 4000
   - Allow port 4000 in Windows Firewall settings

4. **Check network connection:**
   - Device and computer must be on same network (for WiFi)
   - For phone hotspot, ensure computer is connected to hotspot

5. **Check server binding:**
   - Server must bind to `0.0.0.0` (already configured)
   - Check `mock-server/server.ts` line 172: `server.listen(PORT, '0.0.0.0', ...)`

### Issue: "WebSocket connection failed (code 1006)"

**This means the app can't reach the server.**

**Solutions:**

1. **Test server from device browser:**
   - Open browser on Android device
   - Go to: `http://YOUR_COMPUTER_IP:4000/health`
   - Should show: `{"ok": true}`
   - If this doesn't work, server isn't accessible from device

2. **Check IP address:**
   - Verify the IP shown in Expo matches your computer's WiFi IP
   - Windows: `ipconfig` → Look for WiFi adapter IPv4
   - Mac/Linux: `ifconfig` → Look for WiFi adapter inet

3. **Try ADB port forwarding (for USB connection):**
   ```bash
   # Connect device via USB
   # Enable USB debugging on device
   adb reverse tcp:4000 tcp:4000
   # Then modify code to use localhost (see Option C above)
   ```

### Issue: Health Bars Not Updating

**Solutions:**

1. **Check WebSocket is connected** (status should be green)
2. **Check mock server is sending data:**
   - Look at mock server terminal
   - Should see "Client connected" and streaming messages
3. **Check console logs:**
   - Look for "WebSocket connected" message
   - Look for sensor data being received

### Issue: App Shows Blank Screen

**Solutions:**

1. **Check Expo console for errors:**
   - Look for red error messages
   - Common: Missing dependencies, syntax errors

2. **Reload the app:**
   - Press `r` in Expo terminal
   - Or shake device → Reload

3. **Clear cache:**
   ```bash
   # Stop Expo (Ctrl+C)
   # Clear cache and restart
   npm start -- --clear
   ```

### Issue: "Port 4000 is already in use"

**Solutions:**

1. **Find what's using port 4000:**
   ```bash
   # Windows:
   netstat -ano | findstr :4000
   # Note the PID, then kill it:
   taskkill /PID <PID> /F
   
   # Mac/Linux:
   lsof -ti:4000 | xargs kill -9
   ```

2. **Or use the check-port script:**
   ```bash
   cd mock-server
   npm run check-port
   ```

---

## Quick Start Checklist

- [ ] Mock server running on port 4000
- [ ] Expo server running
- [ ] Device/emulator connected
- [ ] Connection status is green
- [ ] Health bars showing values
- [ ] Values updating every second
- [ ] Plant avatar showing emotion
- [ ] Event log showing events

---

## Stopping the App

1. **Stop Expo:** Press `Ctrl+C` in Expo terminal
2. **Stop Mock Server:** Press `Ctrl+C` in mock server terminal
3. **Close device/emulator** (optional)

---

## Next Steps

Once everything is working:

1. **Modify sensor values** using the mock server UI (if available)
2. **Watch health bars update** in real-time
3. **See emotion changes** when scores change
4. **Check event log** for emotion state changes
5. **Test different scenarios** by changing sensor values

---

## Need Help?

- Check `mock-server/README.md` for server details
- Check `plant-whisperer/ANDROID_SETUP.md` for Android setup
- Check `plant-whisperer/INTEGRATION_SUMMARY.md` for technical details
- Check console logs for error messages
- Verify network connectivity between device and computer

---

## Common Commands Reference

```bash
# Start mock server
cd mock-server && npm run server

# Start Expo app
cd plant-whisperer && npm start

# Check port 4000
cd mock-server && npm run check-port

# Test server health
curl http://localhost:4000/health

# Find computer IP (Windows)
ipconfig

# Find computer IP (Mac/Linux)
ifconfig
# or
ip addr show
```

---

## Expected Behavior

When everything is working correctly:

1. ✅ Mock server sends sensor data every 1 second
2. ✅ App receives sensor data via WebSocket
3. ✅ Scores are computed from sensor data
4. ✅ Emotion is derived from scores
5. ✅ Health bars show scores (0-100%)
6. ✅ Plant avatar shows emotion state
7. ✅ Event log shows emotion changes
8. ✅ Reminders appear when hydration is low
9. ✅ Connection status shows "Connected" (green)

Enjoy your plant care game! 🌱🎮

