/**
 * Plant model with sensor guidelines-based logic
 * Implements exact thresholds and states from sensor behavior documentation
 */

import {
  PlantMood,
  EmotionState,
  PlantVitalsRaw,
  PlantScores,
  TemperatureState,
  HumidityState,
  SoilMoistureState,
  BioSignalState,
  AirQualityState,
  PlantCurrentState,
} from '../types/plant';

// MQ-2 baseline (normal reading is ~70)
let mq2Baseline = 70;

// BioAmp EXG moving baseline (stores last 10-20 readings)
const bioReadings: number[] = [];
const BIO_BASELINE_WINDOW = 15; // Average of last 15 readings

/**
 * Set MQ-2 baseline for air quality calculations
 */
export function setMq2Baseline(baseline: number): void {
  mq2Baseline = baseline;
}

/**
 * Get current MQ-2 baseline
 */
export function getMq2Baseline(): number {
  return mq2Baseline;
}

/**
 * Compute temperature state
 * Guidelines:
 * - Optimal for "our plant": 13-27°C → "stable_animation" (perfect state)
 * - Cold: < 13°C → "cold_animation"
 * - Hot: > 27°C → "hot_animation"
 * - Stable: 13-27°C → "stable_animation" (optimal range)
 */
export function computeTemperatureState(temp: number): TemperatureState {
  if (temp < 13) {
    return 'cold_animation';
  } else if (temp > 27) {
    return 'hot_animation';
  } else {
    return 'stable_animation';
  }
}

/**
 * Compute temperature score (0-100) based on optimal range 13-27°C
 * Used for health bar display
 */
export function computeTempScore(temp: number): number {
  const OPTIMAL_MIN = 13;
  const OPTIMAL_MAX = 27;
  const ACCEPTABLE_MIN = 10;
  const ACCEPTABLE_MAX = 30;

  // Within optimal range (13-27°C) = 100
  if (temp >= OPTIMAL_MIN && temp <= OPTIMAL_MAX) {
    return 100;
  }

  // Outside acceptable range = 0-40
  if (temp < ACCEPTABLE_MIN || temp > ACCEPTABLE_MAX) {
    if (temp < ACCEPTABLE_MIN) {
      const r = Math.max(0, (temp - 0) / (ACCEPTABLE_MIN - 0));
      return Math.round(r * 40);
    } else {
      const r = Math.max(0, (35 - temp) / (35 - ACCEPTABLE_MAX));
      return Math.round(r * 40);
    }
  }

  // Within acceptable but outside optimal = 40-100
  if (temp < OPTIMAL_MIN) {
    const r = (temp - ACCEPTABLE_MIN) / (OPTIMAL_MIN - ACCEPTABLE_MIN);
    return Math.round(40 + r * 60);
  } else {
    const r = (ACCEPTABLE_MAX - temp) / (ACCEPTABLE_MAX - OPTIMAL_MAX);
    return Math.round(40 + r * 60);
  }
}

/**
 * Compute humidity state
 * Guidelines:
 * - High humidity: > 80% → "humid"
 * - Low humidity: < 35% → "dry_air"
 * - Normal humidity: 35-80% → "normal_air"
 */
export function computeHumidityState(hum: number): HumidityState {
  if (hum > 80) {
    return 'humid';
  } else if (hum < 35) {
    return 'dry_air';
  } else {
    return 'normal_air';
  }
}

/**
 * Compute humidity score (0-100) based on typical range 40-70%
 * Used for health bar display
 */
export function computeHumScore(hum: number): number {
  const OPTIMAL_MIN = 40;
  const OPTIMAL_MAX = 70;
  const ACCEPTABLE_MIN = 35;
  const ACCEPTABLE_MAX = 80;

  // Within optimal range (40-70%) = 100
  if (hum >= OPTIMAL_MIN && hum <= OPTIMAL_MAX) {
    return 100;
  }

  // Outside acceptable range = 0-40
  if (hum < ACCEPTABLE_MIN || hum > ACCEPTABLE_MAX) {
    if (hum < ACCEPTABLE_MIN) {
      const r = Math.max(0, (hum - 0) / (ACCEPTABLE_MIN - 0));
      return Math.round(r * 40);
    } else {
      const r = Math.max(0, (100 - hum) / (100 - ACCEPTABLE_MAX));
      return Math.round(r * 40);
    }
  }

  // Within acceptable but outside optimal = 40-100
  if (hum < OPTIMAL_MIN) {
    const r = (hum - ACCEPTABLE_MIN) / (OPTIMAL_MIN - ACCEPTABLE_MIN);
    return Math.round(40 + r * 60);
  } else {
    const r = (ACCEPTABLE_MAX - hum) / (ACCEPTABLE_MAX - OPTIMAL_MAX);
    return Math.round(40 + r * 60);
  }
}

/**
 * Compute soil moisture state
 * Guidelines:
 * - Level 0: ≥ 900 → "dry" (Super dry)
 * - Level 1: 700-899 → "thirsty" (Slightly dry)
 * - Level 2: 400-699 → "okay" (Moist)
 * - Level 3: ≤ 399 → "hydrated" (Wet)
 */
export function computeSoilMoistureState(soil: number): SoilMoistureState {
  if (soil >= 900) {
    return 'dry';
  } else if (soil >= 700) {
    return 'thirsty';
  } else if (soil >= 400) {
    return 'okay';
  } else {
    return 'hydrated';
  }
}

/**
 * Compute hydration score (0-100) based on soil moisture levels
 * Used for health bar display
 * Optimal range: 400-699 (okay/moist)
 */
export function computeHydrationScore(soil: number, rain: number): number {
  // Check if watering animation should trigger (raindrop < 300)
  // This is handled separately in state derivation

  // Level 2 (400-699) = optimal = 100
  if (soil >= 400 && soil <= 699) {
    return 100;
  }

  // Level 3 (≤ 399) = hydrated/wet = 80-100 (still good, just wet)
  if (soil < 400) {
    if (soil <= 150) {
      // Fully wet - might be too wet
      return 70;
    }
    // Wet but not too wet
    const r = (soil - 150) / (400 - 150);
    return Math.round(70 + r * 30); // 70 -> 100
  }

  // Level 1 (700-899) = thirsty = 40-80
  if (soil >= 700 && soil < 900) {
    const r = (soil - 700) / (900 - 700);
    return Math.round(80 - r * 40); // 80 -> 40
  }

  // Level 0 (≥ 900) = dry = 0-40
  const r = Math.min(1, (soil - 900) / (1020 - 900));
  return Math.round(40 - r * 40); // 40 -> 0
}

/**
 * Compute comfort score (average of temp and humidity scores)
 */
export function computeComfortScore(temp: number, hum: number): number {
  const tempScore = computeTempScore(temp);
  const humScore = computeHumScore(hum);
  return Math.round((tempScore + humScore) / 2);
}

/**
 * Compute overall plant health for Philodendron Birkin
 * Uses weighted average of critical sensors (soil, temp, hum, mq2)
 * Weightages based on plant health priority:
 * - Soil moisture: 40% (most critical for plant survival)
 * - Temperature: 30% (important for growth)
 * - Humidity: 20% (affects comfort)
 * - MQ2 (Air Quality): 10% (least critical, but still matters)
 * 
 * Does NOT include bio signal or air quality index (those are for animations only)
 */
export function computeOverallHealth(soil: number, temp: number, hum: number, mq2: number): number {
  const soilScore = computeHydrationScore(soil, 1020); // Use default rain value for soil-only calculation
  const tempScore = computeTempScore(temp);
  const humScore = computeHumScore(hum);
  const mq2Score = computeAirQualityScore(mq2);

  // Weighted average
  const overallHealth = (
    soilScore * 0.40 +  // 40% weight - most important
    tempScore * 0.30 +  // 30% weight
    humScore * 0.20 +   // 20% weight
    mq2Score * 0.10     // 10% weight - least important
  );

  return Math.max(0, Math.min(100, Math.round(overallHealth)));
}

/**
 * Check if sensor value is in optimal range
 * Returns true if optimal, false if not
 */
export function isSoilOptimal(soil: number): boolean {
  // Optimal range: 400-699 (okay/moist state)
  return soil >= 400 && soil <= 699;
}

export function isTempOptimal(temp: number): boolean {
  // Optimal range: 13-27°C
  return temp >= 13 && temp <= 27;
}

export function isHumOptimal(hum: number): boolean {
  // Optimal range: 40-70%
  return hum >= 40 && hum <= 70;
}

export function isMq2Optimal(mq2: number): boolean {
  // Optimal: < 150 (air_good)
  return mq2 < 150;
}

/**
 * Update BioAmp EXG moving baseline
 * Guidelines:
 * - Resting range: 400-600
 * - Moving baseline: average of last 10-20 readings
 */
function updateBioBaseline(bio: number): number {
  bioReadings.push(bio);
  if (bioReadings.length > BIO_BASELINE_WINDOW) {
    bioReadings.shift(); // Remove oldest reading
  }

  // Calculate moving average
  const sum = bioReadings.reduce((a, b) => a + b, 0);
  return sum / bioReadings.length;
}

/**
 * Compute bio signal state
 * Guidelines:
 * - Resting range: 400-600
 * - Wind simulation: spikes > 900 or drops < 50
 * - Moving baseline: average of last 10-20 readings
 * - Wind trigger: deviation ±60% from baseline → "wind_trigger"
 * - Rest: signal stabilizes → "rest"
 */
export function computeBioSignalState(bio: number): BioSignalState {
  // Update moving baseline
  const baseline = updateBioBaseline(bio);

  // Check for extreme spikes/drops (wind simulation)
  if (bio > 900 || bio < 50) {
    return 'wind_trigger';
  }

  // Check deviation from baseline (±60%)
  const deviation = Math.abs(bio - baseline);
  const threshold = baseline * 0.6; // 60% of baseline

  if (deviation > threshold) {
    return 'wind_trigger';
  }

  return 'rest';
}

/**
 * Compute bio signal score (0-100) based on resting range 400-600
 * Used for health bar display
 */
export function computeBioSignalScore(bio: number): number {
  const RESTING_MIN = 400;
  const RESTING_MAX = 600;
  const ACCEPTABLE_MIN = 50;
  const ACCEPTABLE_MAX = 900;

  // Within resting range (400-600) = 100
  if (bio >= RESTING_MIN && bio <= RESTING_MAX) {
    return 100;
  }

  // Extreme spikes/drops (< 50 or > 900) = 0-20
  if (bio < ACCEPTABLE_MIN || bio > ACCEPTABLE_MAX) {
    if (bio < ACCEPTABLE_MIN) {
      const r = Math.max(0, bio / ACCEPTABLE_MIN);
      return Math.round(r * 20);
    } else {
      const r = Math.max(0, (1023 - bio) / (1023 - ACCEPTABLE_MAX));
      return Math.round(r * 20);
    }
  }

  // Outside resting but within acceptable = 20-100
  if (bio < RESTING_MIN) {
    const r = (bio - ACCEPTABLE_MIN) / (RESTING_MIN - ACCEPTABLE_MIN);
    return Math.round(20 + r * 80);
  } else {
    const r = (ACCEPTABLE_MAX - bio) / (ACCEPTABLE_MAX - RESTING_MAX);
    return Math.round(20 + r * 80);
  }
}

/**
 * Compute air quality state
 * Guidelines:
 * - Normal range: ~70
 * - Air good: < 150 → "air_good"
 * - Air bad: ≥ 150 → "air_bad"
 * - Hazard: > 200 → "dizzy" or "polluted"
 */
export function computeAirQualityState(mq2: number): AirQualityState {
  if (mq2 > 200) {
    return 'polluted'; // Or 'dizzy' - using 'polluted' as per guidelines
  } else if (mq2 >= 150) {
    return 'air_bad';
  } else {
    return 'air_good';
  }
}

/**
 * Compute air quality score (0-100) based on MQ-2 sensor
 * Guidelines:
 * - Normal: ~70
 * - Baseline: 70
 * - < 150 = good
 * - ≥ 150 = bad
 * - > 200 = hazard
 */
export function computeAirQualityScore(mq2: number): number {
  // Normal/baseline is 70
  const NORMAL = 70;
  const GOOD_THRESHOLD = 150;
  const BAD_THRESHOLD = 200;

  if (mq2 < GOOD_THRESHOLD) {
    // Good air quality (< 150)
    // Closer to normal (70) = better score
    if (mq2 <= NORMAL) {
      return 100; // At or below normal = perfect
    } else {
      // Between normal and good threshold
      const r = (mq2 - NORMAL) / (GOOD_THRESHOLD - NORMAL);
      return Math.round(100 - r * 30); // 100 -> 70
    }
  } else if (mq2 < BAD_THRESHOLD) {
    // Bad air quality (150-200)
    const r = (mq2 - GOOD_THRESHOLD) / (BAD_THRESHOLD - GOOD_THRESHOLD);
    return Math.round(70 - r * 40); // 70 -> 30
  } else {
    // Hazard (> 200)
    const r = Math.min(1, (mq2 - BAD_THRESHOLD) / (500 - BAD_THRESHOLD));
    return Math.round(30 - r * 30); // 30 -> 0
  }
}

/**
 * Compute current plant state from raw vitals
 * Returns all sensor states based on guidelines
 */
export function computePlantCurrentState(vitals: PlantVitalsRaw): PlantCurrentState {
  const temperature = computeTemperatureState(vitals.temperature);
  const humidity = computeHumidityState(vitals.humidity);
  const soilMoisture = computeSoilMoistureState(vitals.soilMoisture);
  const bioSignal = computeBioSignalState(vitals.bio);
  const airQuality = computeAirQualityState(vitals.mq2);
  const isWatering = vitals.raindrop < 300; // Watering animation trigger

  // Generate state text for UI display
  // Format: "Temp: [state] | Humidity: [state] | Soil: [state] | Bio: [state] | Air: [state] | [Watering]"
  // These serve as placeholders for animations until animations are implemented
  const stateParts: string[] = [];
  
  // Temperature state (13-27°C is optimal/stable)
  if (temperature === 'cold_animation') {
    stateParts.push('Temp: Cold [cold_animation]');
  } else if (temperature === 'hot_animation') {
    stateParts.push('Temp: Hot [hot_animation]');
  } else {
    stateParts.push('Temp: Perfect [stable_animation]'); // 13-27°C optimal range
  }

  // Humidity state (placeholder for animations)
  if (humidity === 'humid') {
    stateParts.push('Humidity: Humid [hot_animation]');
  } else if (humidity === 'dry_air') {
    stateParts.push('Humidity: Dry [dry_air_animation]');
  } else {
    stateParts.push('Humidity: Normal [normal_air_animation]');
  }

  // Soil moisture state (placeholder for animations)
  const soilStateText = soilMoisture.charAt(0).toUpperCase() + soilMoisture.slice(1);
  stateParts.push(`Soil: ${soilStateText} [${soilMoisture}_animation]`);

  // Bio signal state (placeholder for animations)
  if (bioSignal === 'wind_trigger') {
    stateParts.push('Bio: Wind [wind_trigger_animation]');
  } else {
    stateParts.push('Bio: Rest [rest_animation]');
  }

  // Air quality state (placeholder for animations)
  if (airQuality === 'polluted') {
    stateParts.push('Air: Polluted [dizzy/polluted_animation]');
  } else if (airQuality === 'air_bad') {
    stateParts.push('Air: Bad [air_bad_animation]');
  } else {
    stateParts.push('Air: Good [air_good_animation]');
  }

  // Watering status (placeholder for animation)
  if (isWatering) {
    stateParts.push('💧 Watering [watering_animation]');
  }

  const stateText = stateParts.join(' | ');

  return {
    temperature,
    humidity,
    soilMoisture,
    bioSignal,
    airQuality,
    isWatering,
    stateText,
  };
}

/**
 * Derive mood from scores (legacy function, kept for compatibility)
 */
export function deriveMood(scores: PlantScores): PlantMood {
  const { hydrationScore, comfortScore, airQualityScore, bioSignalScore } = scores;

  if (hydrationScore < 10) return 'critical';
  if (hydrationScore < 30) return 'thirsty';
  if (comfortScore < 30 || airQualityScore < 30 || bioSignalScore < 20) return 'stressed';
  if (
    hydrationScore > 80 &&
    comfortScore > 80 &&
    airQualityScore > 70 &&
    bioSignalScore > 40
  ) return 'thriving';
  return 'ok';
}

/**
 * Derive emotion state from current state (legacy function, kept for compatibility)
 * Maps new state system to legacy emotion states
 */
export function deriveEmotionState(scores: PlantScores, vitals: PlantVitalsRaw): EmotionState {
  const currentState = computePlantCurrentState(vitals);

  // Watering detection
  if (currentState.isWatering) {
    return 'I_AM_BEING_WATERED';
  }

  // Soil moisture states
  if (currentState.soilMoisture === 'dry') {
    return 'I_AM_NEARLY_DEAD';
  } else if (currentState.soilMoisture === 'thirsty') {
    return 'I_NEED_WATER';
  }

  // Temperature states (aligned with 13-27°C optimal range)
  if (currentState.temperature === 'hot_animation') {
    return 'I_FEEL_HOT'; // > 27°C
  } else if (currentState.temperature === 'cold_animation') {
    return 'I_FEEL_COLD'; // < 13°C
  }
  // stable_animation (13-27°C) is the optimal/perfect state

  // Humidity states
  if (currentState.humidity === 'humid') {
    return 'I_AM_SWEATING_THIS_IS_TOO_HUMID';
  }

  // Air quality states
  if (currentState.airQuality === 'polluted' || currentState.airQuality === 'air_bad') {
    return 'AIR_FEELS_BAD';
  }

  // Bio signal states
  if (currentState.bioSignal === 'wind_trigger') {
    // Could map to connection check, but wind is more of a natural event
    // Keep as okay for now
  }

  // Default gradients
  if (
    scores.hydrationScore >= 80 &&
    scores.comfortScore >= 80 &&
    scores.airQualityScore >= 70 &&
    scores.bioSignalScore >= 40
  ) {
    return 'I_FEEL_GREAT';
  }

  return 'I_AM_OKAY';
}

/**
 * Get human-readable message for emotion state
 */
export function getEmotionMessage(emotion: EmotionState): string {
  switch (emotion) {
    case 'I_NEED_WATER':
      return "I'm thirsty, please water me soon.";
    case 'I_AM_BEING_WATERED':
      return 'Ahh, thank you for the water 💧';
    case 'I_FEEL_HOT':
      return "It's too hot here.";
    case 'I_AM_SWEATING_THIS_IS_TOO_HUMID':
      return "Too humid, I can't breathe.";
    case 'AIR_FEELS_BAD':
      return 'Air quality feels off.';
    case 'CHECK_MY_CONNECTION':
      return 'Check my clips/electrodes.';
    case 'I_AM_NEARLY_DEAD':
      return 'I need water urgently!';
    case 'I_FEEL_COLD':
      return "It's too cold here.";
    case 'I_FEEL_GREAT':
      return 'I feel amazing!';
    case 'I_AM_OKAY':
      return 'I am doing okay.';
    default:
      return 'Status update.';
  }
}
