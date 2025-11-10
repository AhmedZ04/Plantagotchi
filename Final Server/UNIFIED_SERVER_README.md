# Unified Sensor Server

This server combines both **Real Mode** (Arduino serial port) and **Mock Mode** (simulated sensor values) functionality into a single unified server.

## Features

- 🔌 **Real Mode**: Reads sensor data from Arduino via serial port and broadcasts to Android app
- 🎮 **Mock Mode**: Allows you to set simulated sensor values via UI and broadcast to Android app
- 🔄 **Mode Switching**: Switch between real and mock modes on the fly
- 📱 **WebSocket Server**: Broadcasts sensor data to Android app on port 4000
- 🌐 **Web UI**: Access the control panel at `http://localhost:4000`

## Quick Start

1. **Install dependencies:**
   ```bash
   cd "Final Server"
   npm install
   ```

2. **Start the server:**
   ```bash
   npm run server
   ```

3. **Access the UI:**
   - Open your browser and go to: `http://localhost:4000`
   - You'll see the control panel with mode switching buttons

## Usage

### Real Mode (Arduino)

1. **Connect your Arduino:**
   - Plug in your Arduino Uno via USB
   - Ensure it's connected to COM11 (Windows) or set `SERIAL_PORT` environment variable
   - Make sure your Arduino code outputs JSON in the format:
     ```json
     {
       "line": "STATE;soil=395;temp=22.9;hum=19.0;mq2=85;rain=1020;bio=513",
       "json": {"soil":395,"temp":22.9,"hum":19.0,"mq2":85,"rain":1020,"bio":513}
     }
     ```

2. **Switch to Real Mode:**
   - Click the "🔌 Real Mode (Arduino)" button in the UI
   - Or send POST request to `http://localhost:4000/api/mode` with `{"mode": "real"}`
   - The server will automatically connect to the serial port
   - Sensor data from Arduino will be broadcast to the Android app

3. **Monitor:**
   - Watch the preview panel to see what data is being sent to the Android app
   - Check the server console for connection status and data logs

### Mock Mode (Simulated)

1. **Switch to Mock Mode:**
   - Click the "🎮 Mock Mode (Simulated)" button in the UI
   - Or send POST request to `http://localhost:4000/api/mode` with `{"mode": "mock"}`

2. **Set Sensor Values:**
   - Use the sliders or input fields to adjust sensor values
   - Click "Send Once" to send values immediately
   - Or click "Start Stream" to continuously send values at a set interval

3. **Monitor:**
   - Watch the preview panel to see what data is being sent to the Android app
   - The Android app will receive the mock sensor values via WebSocket

## API Endpoints

### GET `/health`
Get server health status and current mode.

**Response:**
```json
{
  "ok": true,
  "mode": "real",
  "state": {
    "soil": 550,
    "temp": 23.0,
    "hum": 60.0,
    "mq2": 70,
    "rain": 1020,
    "bio": 500
  },
  "serialPort": {
    "port": "COM11",
    "connected": true,
    "baudRate": 9600
  }
}
```

### GET `/api/mode`
Get current server mode.

**Response:**
```json
{
  "mode": "real"
}
```

### POST `/api/mode`
Set server mode (real or mock).

**Request:**
```json
{
  "mode": "mock"
}
```

**Response:**
```json
{
  "mode": "mock",
  "previousMode": "real"
}
```

### POST `/api/mock/sensors`
Set mock sensor values (only works in mock mode).

**Request:**
```json
{
  "soil": 550,
  "temp": 23.0,
  "hum": 60.0,
  "mq2": 70,
  "rain": 1020,
  "bio": 500
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Mock sensor data set and broadcasted",
  "state": {
    "soil": 550,
    "temp": 23.0,
    "hum": 60.0,
    "mq2": 70,
    "rain": 1020,
    "bio": 500
  }
}
```

### POST `/sensors`
Receive sensor data from hardware (only works in real mode).

**Request:**
```json
{
  "soil": 550,
  "temp": 23.0,
  "hum": 60.0,
  "mq2": 70,
  "rain": 1020,
  "bio": 500
}
```

## WebSocket

### Connection
Connect to: `ws://localhost:4000/ws`

### Messages from Server

**Sensor Data:**
```json
{
  "line": "STATE;soil=550;temp=23.0;hum=60.0;mq2=70;rain=1020;bio=500.00",
  "json": {
    "soil": 550,
    "temp": 23.0,
    "hum": 60.0,
    "mq2": 70,
    "rain": 1020,
    "bio": 500
  }
}
```

**Mode Change:**
```json
{
  "type": "modeChange",
  "mode": "mock"
}
```

### Messages to Server

**Start Streaming:**
```json
{
  "type": "start",
  "intervalMs": 1000
}
```

**Stop Streaming:**
```json
{
  "type": "stop"
}
```

**Set Mock Values (mock mode only):**
```json
{
  "type": "set",
  "state": {
    "soil": 550,
    "temp": 23.0,
    "hum": 60.0,
    "mq2": 70,
    "rain": 1020,
    "bio": 500
  }
}
```

**Change Mode:**
```json
{
  "type": "setMode",
  "mode": "mock"
}
```

## Configuration

### Environment Variables

- `SERIAL_PORT`: Serial port (default: COM11 on Windows, /dev/ttyUSB0 on Linux/Mac)
- `SERIAL_BAUD_RATE`: Baud rate (default: 9600)
- `PORT`: Server port (default: 4000, required for Android app)

### Example:
```bash
# Windows PowerShell
$env:SERIAL_PORT="COM3"
$env:SERIAL_BAUD_RATE="115200"
npm run server

# Windows CMD
set SERIAL_PORT=COM3
set SERIAL_BAUD_RATE=115200
npm run server

# Mac/Linux
export SERIAL_PORT=/dev/ttyUSB0
export SERIAL_BAUD_RATE=115200
npm run server
```

## Troubleshooting

### Serial Port Not Found
- Check Device Manager (Windows) or `ls /dev/tty.*` (Mac/Linux) to find the correct port
- Ensure Arduino is connected and powered on
- Close Arduino IDE Serial Monitor if it's open
- Set `SERIAL_PORT` environment variable if using a different port

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:4000 | xargs kill -9
```

### Mode Switching Not Working
- Make sure you're sending the correct mode ("real" or "mock")
- Check server console for error messages
- Verify the API endpoint is accessible

### UI Not Loading
- Make sure the `ui` directory exists in the Final Server folder
- Check that the server is running on port 4000
- Try accessing `http://localhost:4000` directly

## Android App Connection

The Android app connects to the WebSocket server at:
- **Emulator**: `ws://10.0.2.2:4000/ws`
- **Physical Device**: `ws://<your-ip>:4000/ws` (ensure server and device are on same network)
- **USB Debugging**: Use ADB port forwarding: `adb reverse tcp:4000 tcp:4000`, then use `ws://localhost:4000/ws`

## Notes

- The server automatically starts streaming when a client connects
- Mode switching is instant and doesn't require server restart
- Serial port connection is only established when in real mode
- Mock mode allows you to test the Android app without Arduino hardware
- Both modes use the same WebSocket interface, so the Android app doesn't need to know which mode is active

