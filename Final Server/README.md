# Final Sensor Server

This server receives sensor data from hardware sensors via serial port (Arduino) and broadcasts it to connected mobile apps via WebSocket.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm run server
   ```

   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

## Usage

### Serial Port Connection (Primary Method)

The server automatically reads sensor data from a serial port (Arduino Uno on COM11 by default).

1. **Connect your Arduino:**
   - Plug in your Arduino Uno via USB
   - Ensure it's connected to COM11 (or set `SERIAL_PORT` environment variable)
   - Make sure your Arduino code outputs data as JSON in the format:
     ```json
     {
       "line": "STATE;soil=395;temp=22.9;hum=19.0;mq2=85;rain=1020;bio=513",
       "json": {"soil":395,"temp":22.9,"hum":19.0,"mq2":85,"rain":1020,"bio":513}
     }
     ```

2. **Start the server:**
   ```bash
   npm run server
   ```

   The server will automatically:
   - Connect to the serial port
   - Parse incoming sensor data (handles multi-line JSON)
   - Broadcast to all connected mobile apps via WebSocket

3. **Change Serial Port:**

   **Windows (PowerShell):**
   ```powershell
   $env:SERIAL_PORT="COM3"
   npm run server
   ```

   **Windows (Command Prompt):**
   ```cmd
   set SERIAL_PORT=COM3
   npm run server
   ```

   **Mac/Linux:**
   ```bash
   export SERIAL_PORT=/dev/ttyUSB0
   npm run server
   ```

4. **Change Baud Rate:**

   **Windows (PowerShell):**
   ```powershell
   $env:SERIAL_BAUD_RATE="115200"
   npm run server
   ```

   **Windows (Command Prompt):**
   ```cmd
   set SERIAL_BAUD_RATE=115200
   npm run server
   ```

   **Mac/Linux:**
   ```bash
   export SERIAL_BAUD_RATE=115200
   npm run server
   ```

   Default is 9600 if not set.

### Receiving Sensor Data (HTTP POST - Fallback Method)

You can send sensor data to the server via HTTP POST:

```bash
POST http://localhost:4000/sensors
Content-Type: application/json

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

### WebSocket Connection

The server broadcasts sensor data to all connected WebSocket clients at:
- `ws://localhost:4000/ws` (local)
- `ws://10.0.2.2:4000/ws` (Android emulator)
- `ws://YOUR_IP:4000/ws` (physical device on same network)

### Message Format

The server sends data in the exact format expected by the Android app:

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

### Health Check

Check server status:
```bash
GET http://localhost:4000/health
```

## Port Configuration

The server runs on port **4000** by default (required for Android app compatibility).

To change the port, set the `PORT` environment variable:
```bash
PORT=4000 npm run server
```

## Troubleshooting

### Port Already in Use

If port 4000 is already in use:
```bash
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:4000 | xargs kill -9
```

### Serial Port Not Found

- Check Device Manager (Windows) or `ls /dev/tty.*` (Mac/Linux) to find the correct port
- Ensure Arduino is connected and powered on
- Close Arduino IDE Serial Monitor if it's open
- Set `SERIAL_PORT` environment variable if using a different port

### Connection Issues

- Make sure the server is running before connecting the app
- Check firewall settings for port 4000
- For Android emulator, use `10.0.2.2:4000`
- For physical devices, ensure device and server are on the same network

### No Data Received from Serial Port

- Verify Arduino code outputs JSON in the correct format
- Check baud rate matches (default: 9600)
- Open Serial Monitor in Arduino IDE to verify data is being sent
- Check server logs for parsing errors

