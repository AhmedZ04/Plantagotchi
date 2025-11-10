import React, { useState, useEffect, useRef } from 'react';
import { ControlsPanel } from './components/ControlsPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { SensorState, WireStatePayload } from './types/sensors';

const WS_URL = 'ws://localhost:4000/ws';

function App() {
  const [state, setState] = useState<SensorState>({
    soil: 550,
    temp: 23,
    hum: 60,
    mq2: 200,
    rain: 900,
    bio: 8.0,
  });
  const [lastPayload, setLastPayload] = useState<WireStatePayload | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('Connected to mock server');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const payload: WireStatePayload = JSON.parse(event.data);
        setLastPayload(payload);
        // Update state from received payload (in case server sends updated state)
        setState(payload.json);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('Disconnected from mock server');
      setIsConnected(false);
      setIsStreaming(false);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, []);

  const handleChange = (next: SensorState) => {
    setState(next);
    // Send update to server
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'set',
        state: next,
      }));
    }
  };

  const handleStartStream = (intervalMs: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'start',
        intervalMs,
      }));
      setIsStreaming(true);
    }
  };

  const handleStopStream = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'stop',
      }));
      setIsStreaming(false);
    }
  };

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>Mock Sensor Server UI</h1>
        <div style={styles.status}>
          <span style={{
            ...styles.statusIndicator,
            backgroundColor: isConnected ? '#4caf50' : '#f44336',
          }}>
            {isConnected ? '● Connected' : '● Disconnected'}
          </span>
          {isStreaming && (
            <span style={styles.streamingBadge}>Streaming...</span>
          )}
        </div>
      </header>

      <main style={styles.main}>
        <ControlsPanel
          state={state}
          onChange={handleChange}
          onStartStream={handleStartStream}
          onStopStream={handleStopStream}
          isStreaming={isStreaming}
        />

        <PreviewPanel lastPayload={lastPayload} />
      </main>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#fafafa',
    padding: '20px',
  },
  header: {
    marginBottom: '30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
  },
  headerTitle: {
    margin: 0,
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#333',
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  statusIndicator: {
    padding: '6px 12px',
    borderRadius: '4px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
  },
  streamingBadge: {
    padding: '6px 12px',
    backgroundColor: '#ff9800',
    color: 'white',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
};

export default App;

