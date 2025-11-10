# Deadzone Implementation for Plant Whisperer

## Overview

Deadzones are **ranges of optimal values** (not single point values) that account for:
- Sensor inaccuracies and calibration variations
- Human error in care routines
- Environmental fluctuations
- Measurement variations

**Any value within a deadzone range = perfect score (100)**

This ensures the plant doesn't appear "unhappy" when conditions are actually fine but slightly vary due to normal sensor/human/environmental factors.

---

## Deadzone Ranges by Sensor

### 1. Hydration (Soil Moisture)

**Deadzone:** `480 - 620` (140 point range)
- **Why wide?** Accounts for:
  - Sensor calibration differences
  - Human watering timing variations
  - Soil composition differences
  - Environmental drainage variations

**Scoring:**
- **Deadzone (480-620):** Score = 100 (perfect)
- **Ideal range (450-700):** Score = 60-100 (gradual transition)
- **Too wet (<450):** Score = 20-100
- **Too dry (>700):** Score = 0-60

**Example:**
- Soil = 550 → In deadzone → Score = 100 ✅
- Soil = 500 → In deadzone → Score = 100 ✅
- Soil = 610 → In deadzone → Score = 100 ✅
- Soil = 470 → Just outside deadzone → Score ≈ 85
- Soil = 630 → Just outside deadzone → Score ≈ 95

---

### 2. Temperature

**Deadzone:** `21°C - 25°C` (4°C range)
- **Why wide?** Accounts for:
  - Temperature sensor accuracy (±1-2°C typical)
  - Room temperature fluctuations
  - Sensor placement variations
  - Time of day variations

**Scoring:**
- **Deadzone (21-25°C):** Score = 100 (perfect)
- **Ideal range (20-26°C):** Score = 40-100 (gradual transition)
- **Acceptable range (18-29°C):** Score = 40-100
- **Outside acceptable:** Score = 0-40

**Example:**
- Temp = 23°C → In deadzone → Score = 100 ✅
- Temp = 22°C → In deadzone → Score = 100 ✅
- Temp = 24.5°C → In deadzone → Score = 100 ✅
- Temp = 20°C → Just outside deadzone → Score ≈ 70
- Temp = 26°C → Just outside deadzone → Score ≈ 70

---

### 3. Humidity

**Deadzone:** `55% - 68%` (13% range)
- **Why wide?** Accounts for:
  - Humidity sensor accuracy (±3-5% typical)
  - Room humidity fluctuations
  - Seasonal variations
  - Ventilation effects

**Scoring:**
- **Deadzone (55-68%):** Score = 100 (perfect)
- **Ideal range (50-70%):** Score = 40-100 (gradual transition)
- **Acceptable range (40-80%):** Score = 40-100
- **Outside acceptable:** Score = 0-40

**Example:**
- Humidity = 60% → In deadzone → Score = 100 ✅
- Humidity = 58% → In deadzone → Score = 100 ✅
- Humidity = 65% → In deadzone → Score = 100 ✅
- Humidity = 52% → Just outside deadzone → Score ≈ 75
- Humidity = 72% → Just outside deadzone → Score ≈ 75

---

### 4. Air Quality (MQ-2)

**Deadzone:** `ratio ≤ 1.15` (range from 0 to 1.15)
- **Why wide?** Accounts for:
  - MQ-2 sensor noise and drift
  - Baseline calibration variations
  - Normal environmental fluctuations
  - Sensor warm-up time

**Ratio = current_reading / baseline_reading**

**Scoring:**
- **Deadzone (ratio ≤ 1.15):** Score = 100 (perfect)
- **Good (ratio 1.15-1.5):** Score = 70-100
- **Moderate (ratio 1.5-2.0):** Score = 40-70
- **Poor (ratio > 2.0):** Score = 20-40

**Example:**
- Ratio = 1.0 → In deadzone → Score = 100 ✅
- Ratio = 1.1 → In deadzone → Score = 100 ✅
- Ratio = 1.15 → In deadzone → Score = 100 ✅
- Ratio = 1.3 → Just outside deadzone → Score ≈ 85
- Ratio = 1.8 → Moderate issues → Score ≈ 55

---

### 5. Bio Signal

**Deadzone:** `4 - 22` (18 point range)
- **Why wide?** Accounts for:
  - Electrode contact variations
  - Signal noise and interference
  - Plant movement
  - Sensor calibration differences

**Scoring:**
- **Deadzone (4-22):** Score = 100 (perfect)
- **Low but acceptable (2-4):** Score = 20-100
- **High but acceptable (22-60):** Score = 40-100
- **Very low (<2):** Score = 0-20 (disconnected)
- **Very high (>60):** Score = 0-40 (noisy)

**Example:**
- Bio = 8 → In deadzone → Score = 100 ✅
- Bio = 5 → In deadzone → Score = 100 ✅
- Bio = 20 → In deadzone → Score = 100 ✅
- Bio = 3 → Just below deadzone → Score ≈ 60
- Bio = 25 → Just above deadzone → Score ≈ 90

---

## Key Benefits of Deadzone Ranges

1. **Forgiving:** Doesn't penalize small variations
2. **Realistic:** Accounts for sensor limitations
3. **User-friendly:** Users don't need perfect precision
4. **Stable:** Prevents constant score fluctuations
5. **Practical:** Reflects real-world measurement variability

---

## Implementation Details

### Location
All deadzone logic is implemented in `plant-whisperer/src/services/plantModel.ts`

### Functions
- `computeHydrationScore(soil, rain)` - Hydration deadzone
- `computeTempScore(temp)` - Temperature deadzone
- `computeHumScore(hum)` - Humidity deadzone
- `computeAirQualityScore(mq2)` - Air quality deadzone
- `computeBioSignalScore(bio)` - Bio signal deadzone

### How It Works

1. **Check if value is in deadzone range:**
   ```typescript
   if (value >= DEADZONE_MIN && value <= DEADZONE_MAX) {
     return 100; // Perfect score
   }
   ```

2. **Gradual transition outside deadzone:**
   - Values just outside deadzone get high scores (80-99)
   - Scores gradually decrease as values move further away
   - Prevents sudden score drops

3. **Multiple range tiers:**
   - Deadzone (optimal) → Score = 100
   - Ideal range → Score = 60-100
   - Acceptable range → Score = 40-100
   - Outside acceptable → Score = 0-40

---

## Adjusting Deadzones

If you need to adjust deadzone ranges, modify the constants in `plantModel.ts`:

```typescript
// Hydration
const DEADZONE_MIN = 480;  // Adjust as needed
const DEADZONE_MAX = 620;  // Adjust as needed

// Temperature
const DEADZONE_MIN = 21;   // Adjust as needed
const DEADZONE_MAX = 25;   // Adjust as needed

// Humidity
const DEADZONE_MIN = 55;   // Adjust as needed
const DEADZONE_MAX = 68;   // Adjust as needed

// Air Quality
const DEADZONE_MAX_RATIO = 1.15;  // Adjust as needed

// Bio Signal
const DEADZONE_MIN = 4;    // Adjust as needed
const DEADZONE_MAX = 22;   // Adjust as needed
```

**Recommendations:**
- Wider deadzones = more forgiving (good for beginners)
- Narrower deadzones = more precise (good for advanced users)
- Consider sensor accuracy when setting ranges
- Test with real sensor data to validate ranges

---

## Testing Deadzones

To test if deadzones are working correctly:

1. **Set sensor values within deadzone ranges:**
   - Soil: 480-620 → Should show score = 100
   - Temp: 21-25°C → Should show score = 100
   - Hum: 55-68% → Should show score = 100
   - MQ2 ratio: ≤1.15 → Should show score = 100
   - Bio: 4-22 → Should show score = 100

2. **Check health bars:**
   - Health bars should show 100% when in deadzone
   - Should gradually decrease as values move away

3. **Check emotion state:**
   - Should show "I_FEEL_GREAT" when all scores are in deadzone
   - Should show "I_AM_OKAY" when scores are good but not perfect

4. **Test edge cases:**
   - Values just inside deadzone → Score = 100
   - Values just outside deadzone → Score ≈ 85-99
   - Values far from deadzone → Score < 60

---

## Summary

Deadzones are **ranges, not single values**, that account for:
- ✅ Sensor inaccuracies
- ✅ Human error
- ✅ Environmental variations
- ✅ Measurement differences

This ensures the plant care game is **forgiving and realistic**, rather than requiring perfect precision that's impossible to achieve in real-world conditions.

