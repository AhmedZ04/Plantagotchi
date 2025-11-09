import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import cors from 'cors';
import { SerialPort } from 'serialport';

interface SensorState {
  soil: number;      // raw 0-1023
  temp: number;      // °C
  hum: number;       // % RH
  mq2: number;       // raw 0-1023
  rain: number;      // raw 0-1023
  bio: number;       // arbitrary float (signal metric)
}

interface WireStatePayload {
  line: string;
  json: SensorState;
}

interface WebSocketMessage {
  type: 'start' | 'stop';
  intervalMs?: number;
}

// Current sensor state - initialized with default values
let currentState: SensorState = {
  soil: 550,
  temp: 23.0,
  hum: 60.0,
  mq2: 200,
  rain: 900,
  bio: 8.0,
};

let streamInterval: NodeJS.Timeout | null = null;
let streamIntervalMs = 1000;

// Serial port configuration
// Get from environment variable or use default COM11 (Windows) / /dev/ttyUSB0 (Linux/Mac)
const SERIAL_PORT = process.env.SERIAL_PORT || (process.platform === 'win32' ? 'COM11' : '/dev/ttyUSB0');
const SERIAL_BAUD_RATE = process.env.SERIAL_BAUD_RATE ? parseInt(process.env.SERIAL_BAUD_RATE, 10) : 9600; // Default 9600, can be overridden

let serialPort: SerialPort | null = null;
let isSerialConnected = false;

// Buffer for accumulating multi-line JSON from Arduino
let jsonBuffer = '';
let braceCount = 0;

// Create Express app
const app = express();
app.use(cors()); // Enable CORS for all routes
app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    state: currentState,
    serialPort: {
      port: SERIAL_PORT,
      connected: isSerialConnected,
      baudRate: SERIAL_BAUD_RATE
    }
  });
});

// Endpoint to receive sensor data from hardware
// Accepts data in the same format as your sensors output
// Can accept either { line: "...", json: {...} } or just { json: {...} }
app.post('/sensors', (req, res) => {
  try {
    const payload = req.body;

    // Extract json data - handle both formats:
    // 1. { line: "...", json: {...} } - full payload format
    // 2. { json: {...} } - just json data
    // 3. Direct sensor values { soil: ..., temp: ..., ... }
    let json: SensorState;

    if (payload.json && typeof payload.json === 'object') {
      // Format 1 or 2: Has json field
      json = payload.json;
    } else if (
      typeof payload.soil === 'number' &&
      typeof payload.temp === 'number' &&
      typeof payload.hum === 'number' &&
      typeof payload.mq2 === 'number' &&
      typeof payload.rain === 'number' &&
      typeof payload.bio === 'number'
    ) {
      // Format 3: Direct sensor values
      json = {
        soil: payload.soil,
        temp: payload.temp,
        hum: payload.hum,
        mq2: payload.mq2,
        rain: payload.rain,
        bio: payload.bio,
      };
    } else {
      return res.status(400).json({ error: 'Invalid payload: missing or invalid sensor data' });
    }

    // Validate all required sensor fields
    if (
      typeof json.soil === 'number' &&
      typeof json.temp === 'number' &&
      typeof json.hum === 'number' &&
      typeof json.mq2 === 'number' &&
      typeof json.rain === 'number' &&
      typeof json.bio === 'number'
    ) {
      // Update state and broadcast
      updateStateFromSensorData(json);

      res.json({ ok: true, message: 'Sensor data received and broadcasted' });
    } else {
      res.status(400).json({ error: 'Invalid sensor data: missing or invalid fields' });
    }
  } catch (error) {
    console.error('❌ Error processing sensor data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

// Helper function to format state as Arduino-style line
function formatStateLine(state: SensorState): string {
  return `STATE;soil=${Math.round(state.soil)};temp=${state.temp.toFixed(1)};hum=${state.hum.toFixed(1)};mq2=${Math.round(state.mq2)};rain=${Math.round(state.rain)};bio=${state.bio.toFixed(2)}`;
}

// Helper function to parse JSON object from Arduino
// Example: {"line": "STATE;soil=395;temp=22.9;hum=19.0;mq2=85;rain=1020;bio=513", "json": {"soil":395,"temp":22.9,"hum":19.0,"mq2":85,"rain":1020,"bio":513}}
function parseSensorData(data: string): SensorState | null {
  try {
    // Remove any leading/trailing whitespace
    const trimmed = data.trim();
    
    // Skip empty strings
    if (!trimmed) {
      return null;
    }
    
    // Must start with { and end with } to be valid JSON
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
      return null;
    }
    
    // Try to parse as JSON
    let parsed: any;
    try {
      parsed = JSON.parse(trimmed);
    } catch (jsonError: any) {
      // If JSON parse fails, this is incomplete or malformed JSON
      // Throw the error so caller knows it's not just missing fields
      throw jsonError;
    }
    
    // Check if it's the expected format with 'json' field
    if (parsed && typeof parsed === 'object' && parsed.json) {
      const json = parsed.json;
      
      // Validate all required sensor fields
      if (
        typeof json.soil === 'number' &&
        typeof json.temp === 'number' &&
        typeof json.hum === 'number' &&
        typeof json.mq2 === 'number' &&
        typeof json.rain === 'number' &&
        typeof json.bio === 'number'
      ) {
        return {
          soil: json.soil,
          temp: json.temp,
          hum: json.hum,
          mq2: json.mq2,
          rain: json.rain,
          bio: json.bio,
        };
      }
    }
    
    return null;
  } catch (error) {
    // Re-throw JSON parse errors so caller can distinguish from validation errors
    throw error;
  }
}

// Helper function to create payload in the exact format expected by the app
function createPayload(state: SensorState): WireStatePayload {
  return {
    line: formatStateLine(state),
    json: { ...state },
  };
}

// Function to update state from sensor data and broadcast
function updateStateFromSensorData(newState: SensorState) {
  // Update current state
  currentState = { ...newState };

  // Broadcast to all WebSocket clients immediately
  broadcast(createPayload(currentState));

  console.log('📊 Sensor data received from serial:', {
    soil: currentState.soil,
    temp: currentState.temp.toFixed(1),
    hum: currentState.hum.toFixed(1),
    mq2: currentState.mq2,
    rain: currentState.rain,
    bio: currentState.bio.toFixed(2),
  });
}

// Helper function to broadcast to all clients
function broadcast(payload: WireStatePayload) {
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Start streaming current state at regular intervals
function startStream(intervalMs: number) {
  if (streamInterval) {
    clearInterval(streamInterval);
  }
  streamIntervalMs = intervalMs;
  streamInterval = setInterval(() => {
    // Broadcast current state
    broadcast(createPayload(currentState));
  }, intervalMs);
}

// Stop streaming
function stopStream() {
  if (streamInterval) {
    clearInterval(streamInterval);
    streamInterval = null;
  }
}

// WebSocket connection handler
wss.on('connection', (ws: WebSocket) => {
  console.log('📱 Client connected');

  // Send current state immediately on connection
  ws.send(JSON.stringify(createPayload(currentState)));

  // Auto-start streaming when a client connects (if not already streaming)
  // This ensures the app gets continuous updates
  if (!streamInterval) {
    startStream(1000); // Start with 1 second interval
    console.log('🔄 Auto-started sensor streaming (1000ms interval)');
  }

  ws.on('message', (data: Buffer) => {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());

      switch (message.type) {
        case 'start':
          const interval = message.intervalMs || 1000;
          startStream(interval);
          console.log(`🔄 Started streaming with ${interval}ms interval`);
          break;

        case 'stop':
          stopStream();
          console.log('⏸️  Stopped streaming');
          break;

        default:
          console.warn('⚠️  Unknown message type:', message);
      }
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    console.log('📱 Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// Initialize Serial Port Connection
function initializeSerialPort() {
  try {
    console.log(`\n🔌 Attempting to connect to serial port: ${SERIAL_PORT} at ${SERIAL_BAUD_RATE} baud`);

    serialPort = new SerialPort({
      path: SERIAL_PORT,
      baudRate: SERIAL_BAUD_RATE,
      autoOpen: false,
    });

    // Use raw data stream instead of line parser to handle multi-line JSON
    // We'll parse JSON objects by tracking braces in the data handler

    serialPort.open((err) => {
      if (err) {
        console.error(`❌ Error opening serial port ${SERIAL_PORT}:`, err.message);
        console.error('   Make sure:');
        console.error('   1. Arduino is connected and powered on');
        console.error('   2. COM port is correct (check Device Manager)');
        console.error('   3. No other program is using the serial port');
        console.error('   4. Set SERIAL_PORT environment variable if using different port');
        isSerialConnected = false;
        return;
      }

      isSerialConnected = true;
      console.log(`✅ Serial port ${SERIAL_PORT} opened successfully`);
    });

    // Handle raw data from serial port (not using line parser)
    serialPort.on('data', (data: Buffer) => {
      const chunk = data.toString('utf8');
      
      // Add chunk to buffer
      jsonBuffer += chunk;
      
      // Count braces to detect complete JSON object
      for (const char of chunk) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
        }
      }
      
      // When brace count reaches 0, we have a complete JSON object
      if (braceCount === 0 && jsonBuffer.trim().length > 0) {
        const trimmedBuffer = jsonBuffer.trim();
        
        // Only attempt to parse if buffer looks like JSON
        if (trimmedBuffer.startsWith('{') && trimmedBuffer.endsWith('}')) {
          try {
            // Try to parse the complete JSON
            const parsedState = parseSensorData(trimmedBuffer);
            
            if (parsedState) {
              // Success! Update state and broadcast
              updateStateFromSensorData(parsedState);
              // Reset buffer after successful parse
              jsonBuffer = '';
              braceCount = 0;
            } else {
              // JSON parsed but missing required fields
              console.warn('⚠️  JSON parsed but missing required fields');
              // Reset buffer to continue with next JSON object
              jsonBuffer = '';
              braceCount = 0;
            }
          } catch (error: any) {
            // JSON parse error - might be incomplete, continue buffering
            // But protect against infinite buffering
            if (jsonBuffer.length > 2000) {
              console.error('❌ Buffer too large after parse error, resetting');
              console.error('   Error:', error.message);
              console.error('   Buffer (first 300):', trimmedBuffer.substring(0, 300));
              jsonBuffer = '';
              braceCount = 0;
            }
          }
        } else {
          // Buffer doesn't have correct JSON structure - might be incomplete
          // Reset if it's getting too large (likely corrupted)
          if (jsonBuffer.length > 2000) {
            console.warn('⚠️  Buffer large but invalid JSON structure, resetting');
            jsonBuffer = '';
            braceCount = 0;
          }
        }
      } else if (braceCount < 0) {
        // More closing braces than opening - corrupted data, reset
        console.warn('⚠️  Brace count negative, resetting buffer');
        jsonBuffer = '';
        braceCount = 0;
      }
      // If braceCount > 0, continue accumulating (incomplete JSON - waiting for more data)
    });

    // Handle serial port errors
    serialPort.on('error', (err) => {
      console.error('❌ Serial port error:', err.message);
      isSerialConnected = false;
    });

    // Handle serial port close
    serialPort.on('close', () => {
      console.log('🔌 Serial port closed');
      isSerialConnected = false;
    });

  } catch (error) {
    console.error('❌ Error initializing serial port:', error);
    isSerialConnected = false;
  }
}

// Start server - Force port 4000 (required for Android app connection)
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

// Validate port is 4000 (required for app connection)
if (PORT !== 4000) {
  console.warn(`⚠️  Warning: Port is set to ${PORT}, but the app expects port 4000`);
  console.warn('   The app will not be able to connect unless port is 4000');
}

// Bind to 0.0.0.0 (all interfaces) so Android emulator can connect via 10.0.2.2
// localhost/127.0.0.1 only works on the same machine
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Final sensor server running on http://0.0.0.0:${PORT}`);
  console.log(`   Accessible at http://localhost:${PORT}`);
  console.log(`   Android emulator: ws://10.0.2.2:${PORT}/ws`);
  console.log(`   WebSocket server available at ws://localhost:${PORT}/ws`);
  console.log(`\n📡 Endpoints:`);
  console.log(`   POST http://localhost:${PORT}/sensors - Receive sensor data (HTTP fallback)`);
  console.log(`   GET  http://localhost:${PORT}/health - Health check`);
  console.log(`   WS   ws://localhost:${PORT}/ws - WebSocket for mobile app`);
  console.log(`\n🔌 Serial Port:`);
  console.log(`   Reading from: ${SERIAL_PORT} at ${SERIAL_BAUD_RATE} baud`);
  console.log(`   Set SERIAL_PORT environment variable to change port\n`);

  // Initialize serial port connection
  initializeSerialPort();
});

// Handle server errors (e.g., port already in use)
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Error: Port ${PORT} is already in use!`);
    console.error('   Please stop any other application using port 4000');
    console.error('   Or kill the process using this command:');
    console.error(`   Windows: netstat -ano | findstr :${PORT}`);
    console.error(`   Mac/Linux: lsof -ti:${PORT} | xargs kill -9`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
    process.exit(1);
  }
});

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  stopStream();

  // Close serial port
  if (serialPort && serialPort.isOpen) {
    serialPort.close((err) => {
      if (err) {
        console.error('Error closing serial port:', err);
      } else {
        console.log('🔌 Serial port closed');
      }
    });
  }

  wss.close();
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});

