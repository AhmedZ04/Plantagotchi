import React, { useState } from 'react';
import { SensorState } from '../types/sensors';

interface ControlsPanelProps {
  state: SensorState;
  onChange: (next: SensorState) => void;
  onStartStream: (intervalMs: number) => void;
  onStopStream: () => void;
  isStreaming: boolean;
}

export function ControlsPanel({
  state,
  onChange,
  onStartStream,
  onStopStream,
  isStreaming,
}: ControlsPanelProps) {
  const [intervalMs, setIntervalMs] = useState(1000);

  const handleChange = (field: keyof SensorState, value: number) => {
    onChange({ ...state, [field]: value });
  };

  const handleSendOnce = () => {
    onChange(state); // Trigger onChange to send
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Sensor Controls</h2>
      
      <div style={styles.grid}>
        {/* Soil Moisture */}
        <div style={styles.control}>
          <label style={styles.label}>
            Birkin Soil Moisture (raw): {Math.round(state.soil)}
          </label>
          <input
            type="range"
            min="0"
            max="1023"
            value={state.soil}
            onChange={(e) => handleChange('soil', parseInt(e.target.value))}
            style={styles.slider}
          />
          <input
            type="number"
            min="0"
            max="1023"
            value={state.soil}
            onChange={(e) => handleChange('soil', parseInt(e.target.value) || 0)}
            style={styles.numberInput}
          />
        </div>

        {/* Temperature */}
        <div style={styles.control}>
          <label style={styles.label}>
            Temperature (°C): {state.temp.toFixed(1)}
          </label>
          <input
            type="range"
            min="10"
            max="35"
            step="0.1"
            value={state.temp}
            onChange={(e) => handleChange('temp', parseFloat(e.target.value))}
            style={styles.slider}
          />
          <input
            type="number"
            min="10"
            max="35"
            step="0.1"
            value={state.temp}
            onChange={(e) => handleChange('temp', parseFloat(e.target.value) || 0)}
            style={styles.numberInput}
          />
        </div>

        {/* Humidity */}
        <div style={styles.control}>
          <label style={styles.label}>
            Humidity (% RH): {state.hum.toFixed(1)}
          </label>
          <input
            type="range"
            min="20"
            max="90"
            step="0.1"
            value={state.hum}
            onChange={(e) => handleChange('hum', parseFloat(e.target.value))}
            style={styles.slider}
          />
          <input
            type="number"
            min="20"
            max="90"
            step="0.1"
            value={state.hum}
            onChange={(e) => handleChange('hum', parseFloat(e.target.value) || 0)}
            style={styles.numberInput}
          />
        </div>

        {/* MQ-2 Gas/Smoke */}
        <div style={styles.control}>
          <label style={styles.label}>
            MQ-2 Air Quality Proxy (raw): {Math.round(state.mq2)}
          </label>
          <input
            type="range"
            min="0"
            max="1023"
            value={state.mq2}
            onChange={(e) => handleChange('mq2', parseInt(e.target.value))}
            style={styles.slider}
          />
          <input
            type="number"
            min="0"
            max="1023"
            value={state.mq2}
            onChange={(e) => handleChange('mq2', parseInt(e.target.value) || 0)}
            style={styles.numberInput}
          />
        </div>

        {/* Raindrop Sensor */}
        <div style={styles.control}>
          <label style={styles.label}>
            Raindrop Surface Wetness (raw): {Math.round(state.rain)}
          </label>
          <input
            type="range"
            min="0"
            max="1023"
            value={state.rain}
            onChange={(e) => handleChange('rain', parseInt(e.target.value))}
            style={styles.slider}
          />
          <input
            type="number"
            min="0"
            max="1023"
            value={state.rain}
            onChange={(e) => handleChange('rain', parseInt(e.target.value) || 0)}
            style={styles.numberInput}
          />
        </div>

        {/* BioAmp EXG */}
        <div style={styles.control}>
          <label style={styles.label}>
            BioAmp Signal Metric: {state.bio.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="50"
            step="0.1"
            value={state.bio}
            onChange={(e) => handleChange('bio', parseFloat(e.target.value))}
            style={styles.slider}
          />
          <input
            type="number"
            min="0"
            max="50"
            step="0.1"
            value={state.bio}
            onChange={(e) => handleChange('bio', parseFloat(e.target.value) || 0)}
            style={styles.numberInput}
          />
        </div>
      </div>

      <div style={styles.buttonGroup}>
        <button
          onClick={handleSendOnce}
          style={styles.button}
          disabled={isStreaming}
        >
          Send Once
        </button>
        
        {!isStreaming ? (
          <>
            <input
              type="number"
              min="100"
              max="10000"
              step="100"
              value={intervalMs}
              onChange={(e) => setIntervalMs(parseInt(e.target.value) || 1000)}
              style={styles.intervalInput}
              placeholder="Interval (ms)"
            />
            <button
              onClick={() => onStartStream(intervalMs)}
              style={styles.button}
            >
              Start Stream ({intervalMs}ms)
            </button>
          </>
        ) : (
          <button
            onClick={onStopStream}
            style={styles.buttonStop}
          >
            Stop Stream
          </button>
        )}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  title: {
    marginTop: 0,
    marginBottom: '20px',
    fontSize: '24px',
    fontWeight: 'bold',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
    marginBottom: '20px',
  },
  control: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
  },
  slider: {
    width: '100%',
  },
  numberInput: {
    width: '100%',
    padding: '4px 8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  button: {
    padding: '10px 20px',
    fontSize: '16px',
    backgroundColor: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  buttonStop: {
    padding: '10px 20px',
    fontSize: '16px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  intervalInput: {
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
    width: '120px',
  },
};

