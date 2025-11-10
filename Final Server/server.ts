import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import cors from 'cors';
import { SerialPort } from 'serialport';
import path from 'path';
import fs from 'fs';

interface SensorState {
  soil: number;      // raw 0-1023
  temp: number;      // °C
  hum: number;       // % RH
  mq2: number;       // raw 0-1023
  rain: number;      // raw 0-1023
  bio: number;       // raw 0-1023 (BioAmp EXG)
}

interface WireStatePayload {
  line: string;
  json: SensorState;
}

interface WebSocketMessage {
  type: 'start' | 'stop' | 'set' | 'setMode';
  intervalMs?: number;
  state?: SensorState;
  mode?: 'real' | 'mock';
}

// Mode: 'real' for Arduino serial, 'mock' for mock values
type ServerMode = 'real' | 'mock';
let currentMode: ServerMode = 'real';

// Current sensor state - initialized with default values
let currentState: SensorState = {
  soil: 550,
  temp: 23.0,
  hum: 60.0,
  mq2: 70,
  rain: 1020,
  bio: 500,
};

let streamInterval: NodeJS.Timeout | null = null;
let streamIntervalMs = 1000;

// Serial port configuration
const SERIAL_PORT = process.env.SERIAL_PORT || (process.platform === 'win32' ? 'COM11' : '/dev/ttyUSB0');
const SERIAL_BAUD_RATE = process.env.SERIAL_BAUD_RATE ? parseInt(process.env.SERIAL_BAUD_RATE, 10) : 9600;

let serialPort: SerialPort | null = null;
let isSerialConnected = false;

// Buffer for accumulating multi-line JSON from Arduino
let jsonBuffer = '';
let braceCount = 0;

// Create Express app
const app = express();
app.use(cors()); // Enable CORS for all routes
app.use(express.json());

// Serve static files for UI (if UI directory exists)
const uiPath = path.join(__dirname, 'ui');
try {
  if (fs.existsSync(uiPath)) {
    app.use(express.static(uiPath));
    console.log('📁 Serving UI from:', uiPath);
    // Serve index.html for root route
    app.get('/', (req, res) => {
      res.sendFile(path.join(uiPath, 'index.html'));
    });
  } else {
    console.log('📁 UI directory not found at:', uiPath);
    console.log('   UI will not be served. Access API endpoints directly.');
  }
} catch (error) {
  console.log('📁 Error setting up UI serving:', error);
  console.log('   UI will not be served. Access API endpoints directly.');
}

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    mode: currentMode,
    state: currentState,
    serialPort: {
      port: SERIAL_PORT,
      connected: isSerialConnected,
      baudRate: SERIAL_BAUD_RATE
    }
  });
});

// Get current mode
app.get('/api/mode', (req, res) => {
  res.json({ mode: currentMode });
});

// Set mode (real or mock)
app.post('/api/mode', (req, res) => {
  const { mode } = req.body;
  if (mode === 'real' || mode === 'mock') {
    const previousMode = currentMode;
    currentMode = mode;
    
    // If switching to real mode, try to connect serial port
    if (mode === 'real' && !isSerialConnected) {
      initializeSerialPort();
    }
    
    // If switching to mock mode, stop serial port reading (but keep it open)
    if (mode === 'mock' && serialPort && serialPort.isOpen) {
      // Don't close serial port, just stop processing its data
      console.log('🔄 Switched to mock mode - serial port data will be ignored');
    }
    
    console.log(`🔄 Mode switched: ${previousMode} → ${mode}`);
    res.json({ mode: currentMode, previousMode });
    
    // Don't broadcast mode change - Android app doesn't need to know about mode changes
    // It just receives sensor data regardless of mode
  } else {
    res.status(400).json({ error: 'Invalid mode. Must be "real" or "mock"' });
  }
});

// Set mock sensor values (only works in mock mode)
app.post('/api/mock/sensors', (req, res) => {
  if (currentMode !== 'mock') {
    return res.status(400).json({ error: 'Cannot set mock values in real mode. Switch to mock mode first.' });
  }
  
  try {
    const payload = req.body;
    let json: SensorState;

    if (payload.json && typeof payload.json === 'object') {
      json = payload.json;
    } else if (
      typeof payload.soil === 'number' &&
      typeof payload.temp === 'number' &&
      typeof payload.hum === 'number' &&
      typeof payload.mq2 === 'number' &&
      typeof payload.rain === 'number' &&
      typeof payload.bio === 'number'
    ) {
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
      // Update state and broadcast (only in mock mode)
      updateStateFromSensorData(json);
      res.json({ ok: true, message: 'Mock sensor data set and broadcasted', state: currentState });
    } else {
      res.status(400).json({ error: 'Invalid sensor data: missing or invalid fields' });
    }
  } catch (error) {
    console.error('❌ Error processing mock sensor data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to receive sensor data from hardware (works in real mode)
app.post('/sensors', (req, res) => {
  if (currentMode !== 'real') {
    return res.status(400).json({ error: 'Cannot receive sensor data in mock mode. Switch to real mode first.' });
  }
  
  try {
    const payload = req.body;
    let json: SensorState;

    if (payload.json && typeof payload.json === 'object') {
      json = payload.json;
    } else if (
      typeof payload.soil === 'number' &&
      typeof payload.temp === 'number' &&
      typeof payload.hum === 'number' &&
      typeof payload.mq2 === 'number' &&
      typeof payload.rain === 'number' &&
      typeof payload.bio === 'number'
    ) {
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
      // Update state and broadcast (only in real mode)
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
function parseSensorData(data: string): SensorState | null {
  try {
    const trimmed = data.trim();
    
    if (!trimmed) {
      return null;
    }
    
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
      return null;
    }
    
    let parsed: any;
    try {
      parsed = JSON.parse(trimmed);
    } catch (jsonError: any) {
      throw jsonError;
    }
    
    if (parsed && typeof parsed === 'object' && parsed.json) {
      const json = parsed.json;
      
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

  const modeLabel = currentMode === 'real' ? 'serial' : 'mock';
  console.log(`📊 Sensor data received from ${modeLabel}:`, {
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

// Broadcast mode change only to UI clients (not Android app)
// Note: We don't broadcast mode changes to Android app since it only needs sensor data
// The UI can check mode via API endpoint
function broadcastModeChange() {
  // Only send mode changes if client sends a special identifier
  // For now, we'll skip broadcasting mode changes to avoid confusing the Android app
  // The UI can poll the /api/mode endpoint to get current mode
  console.log(`🔄 Mode changed to: ${currentMode} (UI can check via /api/mode endpoint)`);
}

// Start streaming current state at regular intervals
function startStream(intervalMs: number) {
  if (streamInterval) {
    clearInterval(streamInterval);
  }
  streamIntervalMs = intervalMs;
  streamInterval = setInterval(() => {
    // Broadcast current state
    // In real mode: state is updated by serial port
    // In mock mode: state is updated by API calls
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
  // Only send sensor data, not mode changes (Android app doesn't need mode info)
  ws.send(JSON.stringify(createPayload(currentState)));

  // Auto-start streaming when a client connects (if not already streaming)
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

        case 'set':
          // Set mock values via WebSocket (only in mock mode)
          if (currentMode === 'mock' && message.state) {
            updateStateFromSensorData(message.state);
            console.log('📊 Mock sensor values updated via WebSocket');
          } else if (currentMode === 'real') {
            console.warn('⚠️  Cannot set sensor values in real mode. Switch to mock mode first.');
          }
          break;

        case 'setMode':
          // Change mode via WebSocket
          if (message.mode === 'real' || message.mode === 'mock') {
            const previousMode = currentMode;
            currentMode = message.mode;
            
            if (currentMode === 'real' && !isSerialConnected) {
              initializeSerialPort();
            }
            
            console.log(`🔄 Mode switched via WebSocket: ${previousMode} → ${currentMode}`);
            // Don't broadcast mode change to avoid confusing Android app
            // Mode changes are handled server-side only
          }
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
  if (currentMode !== 'real') {
    console.log('⚠️  Cannot initialize serial port: not in real mode');
    return;
  }

  try {
    console.log(`\n🔌 Attempting to connect to serial port: ${SERIAL_PORT} at ${SERIAL_BAUD_RATE} baud`);

    // Close existing connection if any
    if (serialPort && serialPort.isOpen) {
      serialPort.close();
    }

    serialPort = new SerialPort({
      path: SERIAL_PORT,
      baudRate: SERIAL_BAUD_RATE,
      autoOpen: false,
    });

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
      
      // Reset buffer
      jsonBuffer = '';
      braceCount = 0;
    });

    // Handle raw data from serial port
    serialPort.on('data', (data: Buffer) => {
      // Only process serial data if in real mode
      if (currentMode !== 'real') {
        return;
      }

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
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Unified sensor server running on http://0.0.0.0:${PORT}`);
  console.log(`   Accessible at http://localhost:${PORT}`);
  console.log(`   Android emulator: ws://10.0.2.2:${PORT}/ws`);
  console.log(`   WebSocket server available at ws://localhost:${PORT}/ws`);
  console.log(`\n📡 Endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/health - Health check`);
  console.log(`   GET  http://localhost:${PORT}/api/mode - Get current mode`);
  console.log(`   POST http://localhost:${PORT}/api/mode - Set mode (real/mock)`);
  console.log(`   POST http://localhost:${PORT}/api/mock/sensors - Set mock sensor values`);
  console.log(`   POST http://localhost:${PORT}/sensors - Receive sensor data (real mode)`);
  console.log(`   WS   ws://localhost:${PORT}/ws - WebSocket for mobile app`);
  console.log(`\n🔌 Serial Port:`);
  console.log(`   Reading from: ${SERIAL_PORT} at ${SERIAL_BAUD_RATE} baud`);
  console.log(`   Set SERIAL_PORT environment variable to change port`);
  console.log(`\n🎮 Current Mode: ${currentMode.toUpperCase()}`);
  console.log(`   Use POST /api/mode to switch between 'real' and 'mock' modes\n`);

  // Initialize serial port connection if in real mode
  if (currentMode === 'real') {
    initializeSerialPort();
  }
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
