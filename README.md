# Plant Whisperer

A pixel art style plant care game app with real-time sensor monitoring.

## 🚀 Quick Start

**See [RUN_INSTRUCTIONS.md](./RUN_INSTRUCTIONS.md) for detailed step-by-step instructions on how to run the app.**

### Quick Run (TL;DR)

1. **Start Mock Server:**
   ```bash
   cd mock-server
   npm install  # First time only
   npm run server
   ```

2. **Start App:**
   ```bash
   cd plant-whisperer
   npm install  # First time only
   npm start
   ```

3. **Connect Device:**
   - Android Emulator: Press `a` in Expo terminal
   - Physical Android: Scan QR code with Expo Go
   - iOS Simulator: Press `i` in Expo terminal
   - Web Browser: Press `w` in Expo terminal

## Main App

See `plant-whisperer/README.md` for the main React Native app setup.

## Mock Sensor Server

A local mock sensor server for testing the plant care app without hardware.

### Setup

1. **Install mock server dependencies:**
   ```bash
   cd mock-server
   npm install
   ```

2. **Install UI dependencies:**
   ```bash
   cd sensor-mock-ui
   npm install
   ```

### Running

1. **Start the mock server:**
   ```bash
   cd mock-server
   npm run server
   ```
   The server will run on `http://localhost:4000` with WebSocket at `ws://localhost:4000/ws`

2. **Start the UI (in a separate terminal):**
   ```bash
   cd sensor-mock-ui
   npm run dev
   ```
   The UI will be available at `http://localhost:5173`

### Usage

- **Controls Panel**: Adjust sensor values using sliders or number inputs
  - `soil`: Soil moisture (0-1023)
  - `temp`: Temperature in °C (10-35)
  - `hum`: Humidity % RH (20-90)
  - `mq2`: MQ-2 gas/smoke sensor (0-1023)
  - `rain`: Raindrop sensor (0-1023)
  - `bio`: BioAmp EXG signal metric (0-50)

- **Send Once**: Immediately send current sensor values
- **Start Stream**: Automatically send sensor readings at specified interval (default 1000ms)
- **Stop Stream**: Stop automatic streaming

- **Preview Panel**: Shows the exact format that the mobile app will consume:
  - Arduino-style line format: `STATE;soil=650;temp=24.5;hum=58.0;mq2=180;rain=900;bio=8.52`
  - Parsed JSON values

### WebSocket Protocol

The server accepts the following messages:

```json
// Set sensor values
{"type": "set", "state": {"soil": 550, "temp": 23, "hum": 60, "mq2": 200, "rain": 900, "bio": 8.0}}

// Start auto-streaming
{"type": "start", "intervalMs": 1000}

// Stop streaming
{"type": "stop"}
```

The server broadcasts messages in this format:

```json
{
  "line": "STATE;soil=650;temp=24.5;hum=58.0;mq2=180;rain=900;bio=8.52",
  "json": {
    "soil": 650,
    "temp": 24.5,
    "hum": 58.0,
    "mq2": 180,
    "rain": 900,
    "bio": 8.52
  }
}
```

### Sensors

- **DHT11**: Temperature (`temp`) and Humidity (`hum`)
- **MQ-2**: Gas/smoke level (`mq2`)
- **Soil Moisture**: Soil moisture level (`soil`)
- **Raindrop**: Surface wetness (`rain`)
- **BioAmp EXG**: Bio signal metric (`bio`)
