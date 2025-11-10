import React from 'react';
import { WireStatePayload } from '../types/sensors';

interface PreviewPanelProps {
  lastPayload: WireStatePayload | null;
}

export function PreviewPanel({ lastPayload }: PreviewPanelProps) {
  if (!lastPayload) {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>Preview</h2>
        <p style={styles.waiting}>Waiting for sensor data...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Preview - What Mobile App Consumes</h2>
      
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Arduino-style Line Format:</h3>
        <code style={styles.codeBlock}>{lastPayload.line}</code>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Parsed JSON Values:</h3>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Sensor</th>
              <th style={styles.th}>Value</th>
              <th style={styles.th}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.td}><strong>soil</strong></td>
              <td style={styles.td}>{Math.round(lastPayload.json.soil)}</td>
              <td style={styles.td}>Soil moisture (raw 0-1023)</td>
            </tr>
            <tr>
              <td style={styles.td}><strong>temp</strong></td>
              <td style={styles.td}>{lastPayload.json.temp.toFixed(1)}°C</td>
              <td style={styles.td}>Temperature</td>
            </tr>
            <tr>
              <td style={styles.td}><strong>hum</strong></td>
              <td style={styles.td}>{lastPayload.json.hum.toFixed(1)}%</td>
              <td style={styles.td}>Humidity (% RH)</td>
            </tr>
            <tr>
              <td style={styles.td}><strong>mq2</strong></td>
              <td style={styles.td}>{Math.round(lastPayload.json.mq2)}</td>
              <td style={styles.td}>MQ-2 gas/smoke (raw 0-1023)</td>
            </tr>
            <tr>
              <td style={styles.td}><strong>rain</strong></td>
              <td style={styles.td}>{Math.round(lastPayload.json.rain)}</td>
              <td style={styles.td}>Raindrop sensor (raw 0-1023)</td>
            </tr>
            <tr>
              <td style={styles.td}><strong>bio</strong></td>
              <td style={styles.td}>{lastPayload.json.bio.toFixed(2)}</td>
              <td style={styles.td}>BioAmp EXG signal metric</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={styles.note}>
        <strong>Note:</strong> This is exactly what the React Native mobile app should consume via WebSocket.
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #ddd',
  },
  title: {
    marginTop: 0,
    marginBottom: '20px',
    fontSize: '24px',
    fontWeight: 'bold',
  },
  waiting: {
    color: '#666',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '10px',
    color: '#333',
  },
  codeBlock: {
    display: 'block',
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '14px',
    color: '#333',
    border: '1px solid #ddd',
    wordBreak: 'break-all',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '10px',
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    backgroundColor: '#f5f5f5',
    border: '1px solid #ddd',
    fontWeight: '600',
  },
  td: {
    padding: '10px 12px',
    border: '1px solid #ddd',
  },
  note: {
    marginTop: '20px',
    padding: '12px',
    backgroundColor: '#e3f2fd',
    borderRadius: '4px',
    color: '#1976d2',
    fontSize: '14px',
  },
};

