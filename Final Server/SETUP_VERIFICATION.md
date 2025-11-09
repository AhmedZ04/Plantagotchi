# Final Server Setup Verification

## ✅ Server Configuration

### Serial Port Input
- **Default Port**: COM11 (Windows) / /dev/ttyUSB0 (Linux/Mac)
- **Baud Rate**: 9600 (configurable via `SERIAL_BAUD_RATE` env var)
- **Data Format**: Multi-line JSON objects
- **Expected Format**:
  ```json
  {
    "line": "STATE;soil=395;temp=22.9;hum=19.0;mq2=85;rain=1020;bio=513",
    "json": {"soil":395,"temp":22.9,"hum":19.0,"mq2":85,"rain":1020,"bio":513}
  }
  ```

### WebSocket Output
- **Port**: 4000 (required for Android app)
- **Path**: `/ws`
- **Message Format**: Matches `WireStatePayload` interface exactly
  ```json
  {
    "line": "STATE;soil=395;temp=22.9;hum=19.0;mq2=85;rain=1020;bio=513",
    "json": {
      "soil": 395,
      "temp": 22.9,
      "hum": 19.0,
      "mq2": 85,
      "rain": 1020,
      "bio": 513
    }
  }
  ```

## ✅ Key Features

1. **Multi-line JSON Parsing**: Buffers incoming serial data until complete JSON object is received
2. **Brace Counting**: Tracks `{` and `}` to detect complete JSON objects
3. **Immediate Broadcasting**: Broadcasts sensor data to all WebSocket clients as soon as it's received
4. **Auto-streaming**: Automatically streams latest state every 1 second to connected clients
5. **HTTP Fallback**: Accepts sensor data via HTTP POST endpoint (`/sensors`)
6. **Health Check**: Provides health endpoint (`/health`) with server status

## ✅ Data Flow

1. **Arduino** → Serial Port → **Server** (reads JSON)
2. **Server** → Parses JSON → Extracts `SensorState`
3. **Server** → Creates `WireStatePayload` → Broadcasts via WebSocket
4. **Mobile App** → Receives `WireStatePayload` → Updates plant state

## ✅ Verification Checklist

- [x] Server reads from serial port (COM11 by default)
- [x] Server handles multi-line JSON from Arduino
- [x] Server parses JSON and extracts sensor values
- [x] Server creates payload in exact format expected by app
- [x] Server broadcasts to all WebSocket clients
- [x] Server auto-streams latest state every second
- [x] Server binds to 0.0.0.0:4000 (accessible from Android emulator)
- [x] All dependencies installed (express, cors, ws, serialport, tsx, typescript)
- [x] TypeScript configuration present (tsconfig.json)
- [x] Package.json scripts configured (server, dev, start)

## 🚀 Running the Server

```bash
cd "Final Server"
npm run server
```

Or with custom serial port:
```bash
# Windows PowerShell
$env:SERIAL_PORT="COM3"
npm run server

# Windows CMD
set SERIAL_PORT=COM3
npm run server

# Mac/Linux
export SERIAL_PORT=/dev/ttyUSB0
npm run server
```

## 📱 Testing

1. **Start the server**: `npm run server`
2. **Connect Arduino**: Ensure Arduino is connected and sending data
3. **Check server logs**: Should show "📊 Sensor data received from serial"
4. **Connect mobile app**: App should connect and receive sensor data
5. **Verify health bars**: Health bars should update in real-time

## 🔧 Troubleshooting

- **Serial port not found**: Check Device Manager (Windows) or `ls /dev/tty.*` (Mac/Linux)
- **No data received**: Verify Arduino is sending JSON in correct format
- **WebSocket connection failed**: Ensure server is running on port 4000
- **Buffer errors**: Check Arduino JSON format is valid

