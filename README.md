# 🌿 Plantagotchi – Interactive Illustrated Plant Care App

<div align="center">
  <img src="Animations/Logo.png" alt="Plant Whisperer Logo" width="100" height="100">

  **A hand-drawn digital companion that lets plants “speak” through real-time sensor emotions.**
  
  [![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
  [![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
  [![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![WebSocket](https://img.shields.io/badge/WebSocket-4B8BBE?style=for-the-badge&logo=socket.io&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
</div>

---

## 📖 About

We grow up learning how to care for pets and people — but not always for the quiet life thriving around us.  
**Plantagotchi** reimagines that connection by turning plant care into an *interactive, emotional experience* where **nature finally speaks back**.  

It’s more than plant care. It’s about paying attention, building a connection, and growing together.
Through bioelectrical signals and live environmental readings, your plant expresses how it feels through hand-drawn emotions and dialogue bubbles, creating a playful, expressive relationship between you and nature.


---

## ✨ Features

### 🌤️ **Real-Time Emotional Feedback**
- The plant reacts dynamically to changes in temperature, humidity, and soil moisture.  
- When you water it or when the weather shifts, its expression changes immediately.  
- See emotion bubbles like *“Whoa, the wind is tossing me!”* or *“I’m thirsty!”* in real time.

### 🧠 **Smart Sensor Integration**
- **BioAmp EXG Pill** detects micro-voltage bio-signals.  
- **MQ-3**, **HL-83**, **YL-69**, and **DHT11** monitor air, water, soil, and temperature.  
- The **Arduino UNO R3** streams data to a backend via **WebSockets** for seamless, live updates.

### 🎨 **Illustrated Art Style**
- Soft, cozy, **hand-drawn visuals** instead of pixel art.  
- Every emotion — happy, tired, dizzy, or peaceful — is drawn with expressive faces, props, and speech bubbles.  
- Crafted for **universal appeal**, from kids to educators to eco-tech enthusiasts.

### 💬 **End-to-End Interactive System**
- **Hardware**: Real sensors capture live environmental and biological signals.  
- **Backend**: Processing pipeline filters noise and interprets plant mood.  
- **Frontend**: A React Native app displays the plant’s reactions in smooth, illustrated animations.

---

## 🎨 Screenshots & Live Animations

| 🌞 **Perfect Conditions** | 💧 **Thirsty Mode** | 🥵 **Dizzy** |
|------------------------|--------------------|----------------|
| ![Perfect](./Animations/peak_animation_night.gif) | ![Thirsty](./Animations/Final/Day/thirsty_animation_day.gif) | ![Bad Air Quality](./Animations/Final/Day/dizzy_animation_day.gif) |
| *Healthy and happy plant in stable conditions* | *Soil moisture too low — needs water!* | *Poor air or gas conditions causing stress* |

| 🌙 **Cold Temperature** | 😵 **Windy** | 💧 **Watering** |
|-------------------|------------------|----------------|
| ![Cold](./Animations/Final/Night/cold_animation.gif) | ![Windy](./Animations/wind_trigger_animation.gif) | ![Water](./Animations/watering_plant_night.gif) |
| *Cold under night lighting* | *In Windy Conditions* | *Watering the plant* |

---
## 🎥 Demo

[**Plantagotchi Live Demo ▶️**](https://youtube.com/shorts/_Rtnkhy3jHY?si=Nw0nGcZnq8E2Oxly)

---

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
