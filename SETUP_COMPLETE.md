# ✅ Mock Server & Sensor Mock UI - Setup Complete!

Both projects have been set up and are ready to use.

## 📦 What Was Installed

### Mock Server (`mock-server/`)
- ✅ Dependencies installed
- ✅ TypeScript configuration ready
- ✅ Server runs on port 4000
- ✅ WebSocket endpoint: `ws://localhost:4000/ws`

### Sensor Mock UI (`sensor-mock-ui/`)
- ✅ Dependencies installed
- ✅ React + Vite setup ready
- ✅ UI runs on port 5173
- ✅ Accessible at: `http://localhost:5173`

## 🚀 How to Start

### Quick Start (Windows)
Double-click: `START_BOTH.bat`

### Manual Start

**Terminal 1 - Mock Server:**
```bash
cd mock-server
npm start
```

**Terminal 2 - Sensor Mock UI:**
```bash
cd sensor-mock-ui
npm start
```

## 🎯 Usage

1. **Start the mock server** (port 4000)
2. **Start the UI** (port 5173)
3. **Open UI in browser**: `http://localhost:5173`
4. **Adjust sensor values** using sliders
5. **Start your mobile app** - it will connect to the mock server

## 📊 Default Values

- Soil: 550 (ideal)
- Temperature: 23°C (ideal)
- Humidity: 60% (ideal)
- MQ-2: 200 (normal)
- Rain: 900 (dry)
- Bio: 8.0 (resting)

## 🧪 Testing

### Test Bad Air Quality
- Set MQ-2 to 250+ → Health bar should decrease

### Test Dry Soil
- Set Soil to 900+ → Hydration score should decrease

### Test Optimal Conditions
- Set all sensors to ideal values → Health should be high

## 📝 Notes

- Mock server **must** run on port 4000 (mobile app expects this)
- Server auto-starts streaming when client connects
- UI changes are sent immediately to all connected clients
- Both services are ready to use!

## 🔧 Troubleshooting

**Port 4000 in use?**
```bash
cd mock-server
npm run check-port
```

**Need to kill a process?**
- Windows: `taskkill /PID <PID> /F`
- Mac/Linux: `kill -9 <PID>`

---

✅ **Everything is set up and ready to go!**

