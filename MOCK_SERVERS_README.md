# Mock Server & Sensor Mock UI

This directory contains two projects for testing the Plant Whisperer app without physical hardware:

1. **mock-server** - WebSocket server that simulates sensor data
2. **sensor-mock-ui** - Web UI for controlling and visualizing mock sensor data

## Quick Start

### Option 1: Start Both Servers (Recommended)

**Windows:**
```bash
START_BOTH.bat
```

**Mac/Linux:**
```bash
# Terminal 1 - Mock Server
cd mock-server
npm run server

# Terminal 2 - Sensor Mock UI
cd sensor-mock-ui
npm run dev
```

### Option 2: Start Individually

**Mock Server:**
```bash
cd mock-server
npm install  # First time only
npm run server
```

**Sensor Mock UI:**
```bash
cd sensor-mock-ui
npm install  # First time only
npm run dev
```

## What Each Service Does

### Mock Sensor Server (Port 4000)

- WebSocket server that simulates Arduino sensor data
- Sends sensor readings in the format expected by the mobile app
- Auto-starts streaming when a client connects
- Accessible at: `ws://localhost:4000/ws`
- Android emulator: `ws://10.0.2.2:4000/ws`

### Sensor Mock UI (Port 5173)

- Web interface to control mock sensor values
- Real-time preview of what the mobile app receives
- Adjust all sensor values with sliders
- Start/stop streaming
- Accessible at: `http://localhost:5173`

## Usage

1. **Start the mock server:**
   ```bash
   cd mock-server
   npm run server
   ```

2. **Start the UI (in another terminal):**
   ```bash
   cd sensor-mock-ui
   npm run dev
   ```

3. **Open the UI in your browser:**
   - Go to `http://localhost:5173`
   - You should see "Connected" status

4. **Adjust sensor values:**
   - Use sliders or number inputs to change sensor values
   - Changes are sent immediately to the server
   - The mobile app will receive updates if connected

5. **Start your mobile app:**
   - The React Native app should connect to `ws://localhost:4000/ws`
   - Or `ws://10.0.2.2:4000/ws` if running on Android emulator

## Default Sensor Values

The server starts with Birkin-friendly defaults:

- **Soil Moisture**: 550 (ideal range: 400-699)
- **Temperature**: 23°C (ideal range: 21-26°C)
- **Humidity**: 60% (ideal range: 35-80%)
- **MQ-2 Air Quality**: 200 (normal baseline)
- **Raindrop Sensor**: 900 (dry)
- **BioAmp Signal**: 8.0 (resting range)

## Testing Scenarios

### Test Low Health (Gas Sensor)
1. Open Sensor Mock UI
2. Set MQ-2 to 250+ (bad air quality)
3. Watch the health bar decrease in the mobile app

### Test Dry Soil
1. Set Soil Moisture to 900+ (dry)
2. Watch hydration score decrease

### Test Optimal Conditions
1. Set all sensors to ideal values:
   - Soil: 550
   - Temp: 23
   - Hum: 60
   - MQ-2: 200
   - Rain: 900
   - Bio: 8.0

## Troubleshooting

### Port 4000 Already in Use

**Windows:**
```bash
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
lsof -ti:4000 | xargs kill -9
```

### Port 5173 Already in Use

The UI will automatically try the next available port. Check the terminal output for the actual port.

### Connection Issues

1. **Check server is running:**
   - Visit `http://localhost:4000/health`
   - Should return: `{"ok": true}`

2. **Check UI connection:**
   - Look for "Connected" status in the UI
   - Check browser console for errors

3. **Check mobile app:**
   - Verify the app is connecting to the correct WebSocket URL
   - Check app logs for connection errors

## Development

### Mock Server

- **File**: `mock-server/server.ts`
- **Port**: 4000 (required - app expects this port)
- **Auto-reload**: `npm run dev`

### Sensor Mock UI

- **File**: `sensor-mock-ui/src/App.tsx`
- **Port**: 5173 (default, can change)
- **Hot-reload**: Automatically enabled with Vite

## WebSocket Protocol

### Server Messages (to clients):
```json
{
  "line": "STATE;soil=550;temp=23.0;hum=60.0;mq2=200;rain=900;bio=8.00",
  "json": {
    "soil": 550,
    "temp": 23.0,
    "hum": 60.0,
    "mq2": 200,
    "rain": 900,
    "bio": 8.0
  }
}
```

### Client Messages (to server):
```json
// Set sensor values
{"type": "set", "state": {"soil": 550, "temp": 23, "hum": 60, "mq2": 200, "rain": 900, "bio": 8.0}}

// Start streaming
{"type": "start", "intervalMs": 1000}

// Stop streaming
{"type": "stop"}
```

## Notes

- The mock server **must** run on port 4000 (the mobile app is hardcoded to this port)
- The server binds to `0.0.0.0` so Android emulator can connect via `10.0.2.2:4000/ws`
- Sensor values remain constant until manually changed via the UI
- The server auto-starts streaming when a client connects
- Changes in the UI are sent immediately to all connected clients (including the mobile app)

