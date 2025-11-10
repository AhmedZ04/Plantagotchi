/**
 * WebSocket client for sensor data
 * Connects to mock sensor server and emits parsed sensor readings
 */

import { SensorState } from '../types/plant';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

interface WireStatePayload {
  line: string;
  json: SensorState;
}

class DataClient {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'idle';
  private url: string = 'ws://10.0.2.2:4000/ws'; // Android emulator default
  private onUpdateCallback: ((state: SensorState) => void) | null = null;
  private statusCallbacks: Set<(status: ConnectionStatus) => void> = new Set();
  private isConnecting: boolean = false;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isDisconnecting: boolean = false; // Track if we're intentionally disconnecting

  /**
   * Initialize the data client with optional URL
   * @param url WebSocket URL (defaults to Android emulator address)
   */
  init(url?: string): void {
    if (url) {
      this.url = url;
    }
  }

  /**
   * Set status and notify all listeners
   */
  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.statusCallbacks.forEach((callback) => callback(status));
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusCallbacks.add(callback);
    // Return unsubscribe function
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  /**
   * Connect to WebSocket server
   * @param onUpdate Callback when sensor data is received
   */
  connect(onUpdate: (state: SensorState) => void): void {
    // Update callback even if already connected
    this.onUpdateCallback = onUpdate;

    // If already connected or connecting, don't create a new connection
    if (this.ws) {
      const readyState = this.ws.readyState;
      if (readyState === WebSocket.OPEN || readyState === WebSocket.CONNECTING) {
        // Already connected or connecting, just update callback
        return;
      }
      // WebSocket is in CLOSED or CLOSING state, clean it up first
      this.ws = null;
    }

    // If already attempting to connect, don't start another attempt
    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    this.setStatus('connecting');

    // Clear any pending reconnection attempts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected to', this.url);
        this.isConnecting = false;
        this.setStatus('connected');
        
        // Request auto-streaming from server (server auto-starts, but this ensures it)
        // Send start message to ensure continuous updates
        try {
          this.ws?.send(JSON.stringify({
            type: 'start',
            intervalMs: 1000, // 1 second updates
          }));
          console.log('Requested sensor data streaming (1000ms interval)');
        } catch (error) {
          console.warn('Failed to request streaming:', error);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Only process messages that have the sensor data format (line and json fields)
          // Ignore any other message types (like mode changes, etc.)
          if (!data.line || !data.json) {
            // Not a sensor data message, ignore it silently
            return;
          }
          
          const payload: WireStatePayload = data;
          
          // Validate payload has required fields
          if (
            typeof payload.json?.soil === 'number' &&
            typeof payload.json?.temp === 'number' &&
            typeof payload.json?.hum === 'number' &&
            typeof payload.json?.mq2 === 'number' &&
            typeof payload.json?.rain === 'number' &&
            typeof payload.json?.bio === 'number'
          ) {
            this.onUpdateCallback?.(payload.json);
          } else {
            console.warn('Invalid sensor data received:', payload);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        // Only log errors if we're not intentionally disconnecting
        // and if the connection isn't already closed
        if (!this.isDisconnecting && this.ws && this.ws.readyState !== WebSocket.CLOSED) {
          // Log a simplified error message instead of the full error object
          console.warn('WebSocket connection error. Check if server is running at', this.url);
        }
        this.isConnecting = false;
        // Don't set error status immediately - wait for onclose
      };

      this.ws.onclose = (event) => {
        const code = 'code' in event ? event.code : undefined;
        const wasDisconnecting = this.isDisconnecting;
        this.isConnecting = false;
        this.isDisconnecting = false;
        
        // Only log if it wasn't an intentional disconnect
        if (!wasDisconnecting) {
          // Close code 1006 is "abnormal closure" - usually means connection failed
          // This can happen if the server isn't running or isn't accessible
          if (code === 1006) {
            console.warn(
              'WebSocket connection failed (code 1006). ' +
              'Make sure the mock server is running at ' + this.url.replace('ws://', 'http://')
            );
          } else if (code !== 1000 && code !== 1001) {
            // Only log non-normal closures
            console.log('WebSocket disconnected', code ? `(code: ${code})` : '');
          }
        }
        
        // Clear the WebSocket reference
        this.ws = null;
        
        // Set status based on close code if available
        // Normal closure codes: 1000 (normal), 1001 (going away)
        if (wasDisconnecting || (code !== undefined && (code === 1000 || code === 1001))) {
          this.setStatus('idle');
        } else if (code !== undefined && code !== 1000 && code !== 1001) {
          // Only set error status if it wasn't an intentional disconnect
          // 1006 means connection failed - could be server not running or network issue
          this.setStatus('error');
        } else {
          // If code is not available, assume idle (normal disconnect)
          this.setStatus('idle');
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.isConnecting = false;
      this.setStatus('error');
      this.ws = null;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    // Mark that we're intentionally disconnecting
    this.isDisconnecting = true;
    
    // Clear any pending reconnection attempts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.isConnecting = false;

    if (this.ws) {
      // Close the connection if it's open or connecting
      const readyState = this.ws.readyState;
      if (readyState === WebSocket.OPEN || readyState === WebSocket.CONNECTING) {
        // Use close without code for React Native compatibility
        try {
          // Remove error handler to prevent error logs during intentional disconnect
          this.ws.onerror = null;
          this.ws.close();
        } catch (error) {
          // Ignore errors during cleanup
        }
      }
      // Don't null ws immediately - let onclose handle it
      // But remove handlers to prevent callbacks
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws = null;
    }
    this.setStatus('idle');
    this.onUpdateCallback = null;
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }
}

// Export singleton instance
export const dataClient = new DataClient();

