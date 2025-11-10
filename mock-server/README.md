# Mock Sensor Server

Mock WebSocket server for testing the Plant Whisperer app without physical hardware.

## Requirements

- Node.js 18+ 
- Port 4000 must be available (required for app connection)

## Setup

```bash
npm install
```

## Running the Server

### Start the server:
```bash
npm run server
```

The server will:
- ✅ Run on port 4000 (required - the app expects this port)
- ✅ Bind to all interfaces (0.0.0.0) so Android emulator can connect
- ✅ WebSocket endpoint: `ws://localhost:4000/ws`
- ✅ Android emulator: `ws://10.0.2.2:4000/ws`

### Check if port 4000 is available:
```bash
npm run check-port
```

## Port 4000 Already in Use?

If port 4000 is already in use, you'll see an error. Here's how to free it:

### Quick Fix (Recommended):
```bash
npm run free-port
```

This will automatically find and kill any process using port 4000.

### Manual Fix:

### Windows:
```bash
# Find the process using port 4000
netstat -ano | findstr :4000

# Kill the process (replace <PID> with the process ID)
taskkill /PID <PID> /F

# Or kill all Node.js processes
taskkill /IM node.exe /F
```

### Mac/Linux:
```bash
# Find and kill the process using port 4000
lsof -ti:4000 | xargs kill -9
```

## Important Notes

1. **Port 4000 is Required**: The React Native app is hardcoded to connect to port 4000. Changing the port will break the connection.

2. **Android Emulator**: The server binds to `0.0.0.0` (all interfaces) so the Android emulator can connect via `10.0.2.2:4000/ws`.

3. **Default Sensor Values**: The server starts with Birkin-friendly defaults:
   - Soil: 550 (ideal range)
   - Temperature: 23°C (ideal)
   - Humidity: 60% (ideal)
   - MQ2: 200
   - Rain: 900 (dry)
   - Bio: 8.0

## WebSocket Protocol

### Messages from Server:
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

### Messages to Server:
```json
// Set sensor values
{"type": "set", "state": {"soil": 550, "temp": 23, "hum": 60, "mq2": 200, "rain": 900, "bio": 8.0}}

// Start auto-streaming (default: 1000ms interval)
{"type": "start", "intervalMs": 1000}

// Stop streaming
{"type": "stop"}
```

## Development

Run with auto-reload:
```bash
npm run dev
```

## Troubleshooting

### Connection Issues

1. **Check server is running**: Visit `http://localhost:4000/health` - should return `{"ok": true}`

2. **Check port is available**: Run `npm run check-port`

3. **Android emulator connection**: Make sure server binds to `0.0.0.0` (not just `localhost`)

4. **Firewall**: Ensure firewall allows connections on port 4000

### Common Errors

- **EADDRINUSE**: Port 4000 is already in use - free it using the commands above
- **Connection refused**: Server isn't running or firewall is blocking
- **Code 1006**: Connection failed - check server is running and accessible

