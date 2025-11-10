import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

interface SensorState {
  soil: number;      // raw 0-1023
  temp: number;      // °C
  hum: number;       // % RH
  mq2: number;       // raw 0-1023
  rain: number;      // raw 0-1023
  bio: number;       // arbitrary 0-100-ish float (signal metric)
}

interface WireStatePayload {
  line: string;
  json: SensorState;
}

interface WebSocketMessage {
  type: 'set' | 'start' | 'stop';
  state?: SensorState;
  intervalMs?: number;
}

// Default initial state - Birkin-friendly defaults
let currentState: SensorState = {
  soil: 550,
  temp: 23,
  hum: 60,
  mq2: 200,
  rain: 900, // dry
  bio: 8.0,
};

let streamInterval: NodeJS.Timeout | null = null;
let streamIntervalMs = 1000;

// Create Express app
const app = express();
app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

// Helper function to format state as Arduino-style line
function formatStateLine(state: SensorState): string {
  return `STATE;soil=${Math.round(state.soil)};temp=${state.temp.toFixed(1)};hum=${state.hum.toFixed(1)};mq2=${Math.round(state.mq2)};rain=${Math.round(state.rain)};bio=${state.bio.toFixed(2)}`;
}

// Helper function to create payload
function createPayload(state: SensorState): WireStatePayload {
  return {
    line: formatStateLine(state),
    json: { ...state },
  };
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

// Start streaming
// Note: Values remain constant (no random noise) - only change when user manually sets them
function startStream(intervalMs: number) {
  if (streamInterval) {
    clearInterval(streamInterval);
  }
  streamIntervalMs = intervalMs;
  streamInterval = setInterval(() => {
    // Send current state as-is, without adding noise
    // Values only change when user manually adjusts them via the UI
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
  console.log('Client connected');

  // Send current state immediately on connection
  ws.send(JSON.stringify(createPayload(currentState)));

  // Auto-start streaming when a client connects (if not already streaming)
  // This ensures the app gets continuous updates
  if (!streamInterval) {
    startStream(1000); // Start with 1 second interval
    console.log('Auto-started sensor streaming (1000ms interval)');
  }

  ws.on('message', (data: Buffer) => {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());

      switch (message.type) {
        case 'set':
          if (message.state) {
            currentState = { ...message.state };
            // Broadcast immediately
            broadcast(createPayload(currentState));
          }
          break;

        case 'start':
          const interval = message.intervalMs || 1000;
          startStream(interval);
          break;

        case 'stop':
          stopStream();
          break;

        default:
          console.warn('Unknown message type:', message);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Start server - Force port 4000 (required for Android emulator connection)
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

// Validate port is 4000 (required for app connection)
if (PORT !== 4000) {
  console.warn(`⚠️  Warning: Port is set to ${PORT}, but the app expects port 4000`);
  console.warn('   The app will not be able to connect unless port is 4000');
}

// Bind to 0.0.0.0 (all interfaces) so Android emulator can connect via 10.0.2.2
// localhost/127.0.0.1 only works on the same machine
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Mock sensor server running on http://0.0.0.0:${PORT}`);
  console.log(`   Accessible at http://localhost:${PORT}`);
  console.log(`   Android emulator: ws://10.0.2.2:${PORT}/ws`);
  console.log(`   WebSocket server available at ws://localhost:${PORT}/ws`);
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
    console.error('Server error:', error);
    process.exit(1);
  }
});

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  stopStream();
  wss.close();
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});

