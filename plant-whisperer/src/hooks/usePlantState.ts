/**
 * Hook for managing plant state
 * Wires WebSocket, computes scores, and derives mood/emotion
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import {
  PlantState,
  PlantVitals,
  PlantVitalsRaw,
  PlantScores,
  PlantEvent,
  Reminder,
  EmotionState,
  PlantMood,
  PlantCurrentState,
} from '../types/plant';
import { ComfortMetrics, CareTargets } from '../types/plant';
import { dataClient, ConnectionStatus } from '../services/dataClient';
import {
  computeHydrationScore,
  computeComfortScore,
  computeAirQualityScore,
  computeBioSignalScore,
  computeBioSignalState,
  deriveMood,
  deriveEmotionState,
  getEmotionMessage,
  setMq2Baseline,
  computePlantCurrentState,
} from '../services/plantModel';
import { SensorState } from '../types/plant';
import { fetchCareFieldsForName } from '../services/perenual';

// Perenual watering benchmark parser
function parseBenchmarkDays(value: unknown, unit?: string | null): number | null {
  let days: number | null = null;
  const u = (unit || '').toString().toLowerCase();
  if (typeof value === 'number' && !isNaN(value)) days = value;
  else if (typeof value === 'string') {
    const nums = value.match(/\d+(?:\.\d+)?/g)?.map((n) => parseFloat(n)) || [];
    if (nums.length === 1) days = nums[0];
    else if (nums.length >= 2) days = (nums[0] + nums[1]) / 2;
  }
  if (days == null) return null;
  if (u.includes('week')) return days * 7;
  return days; // assume days otherwise
}

interface UsePlantStateReturn {
  // State
  vitals: PlantVitals;
  rawVitals: PlantVitalsRaw; // Expose raw sensor values for HealthBars
  scores: PlantScores | null;
  metrics?: ComfortMetrics | null;
  careTargets: CareTargets | null;
  mood: PlantMood;
  emotion: EmotionState;
  currentState: PlantCurrentState | null;
  eventLog: PlantEvent[];
  pendingReminder: Reminder | null;
  simulationMode: boolean;
  connectionStatus: ConnectionStatus;
  // Allow UI to enable immediate updates during sensor inspection
  setRealtimeMode?: (enabled: boolean) => void;
  
  // Actions
  setSimulationMode: (enabled: boolean) => void;
  setSimulatedVitals: (vitals: Partial<SensorState>) => void;
  
  // Plant info
  id: string;
  name: string;
  species?: string;
  status: ConnectionStatus;
  level?: number;
}

// Default initial state
const DEFAULT_VITALS: PlantVitals = {
  health: 85,
  water: 60,
  sunlight: 75,
  soil: 70,
};

const DEFAULT_SCORES: PlantScores = {
  hydrationScore: 60,
  comfortScore: 75,
  airQualityScore: 80,
  bioSignalScore: 50,
};

// Default raw vitals (based on sensor guidelines)
const DEFAULT_RAW_VITALS: PlantVitalsRaw = {
  soilMoisture: 550, // Level 2 (okay/moist range: 400-699)
  temperature: 23, // Within optimal range (13-27°C)
  humidity: 60, // Normal air range (35-80%)
  mq2: 70, // Normal baseline (~70)
  raindrop: 1020, // Dry (~1020)
  bio: 500, // Resting range (400-600)
  timestamp: new Date(),
};

export function usePlantState(): UsePlantStateReturn {
  // Raw sensor data
  const [rawVitals, setRawVitals] = useState<PlantVitalsRaw>(DEFAULT_RAW_VITALS);
  
  // Computed state
  const [scores, setScores] = useState<PlantScores | null>(DEFAULT_SCORES);
  const [metrics, setMetrics] = useState<ComfortMetrics | null>(null);
  const [mood, setMood] = useState<PlantMood>('ok');
  const [emotion, setEmotion] = useState<EmotionState>('I_AM_OKAY');
  const [currentState, setCurrentState] = useState<PlantCurrentState | null>(null);
  const [vitals, setVitals] = useState<PlantVitals>(DEFAULT_VITALS);
  
  // UI state
  const [eventLog, setEventLog] = useState<PlantEvent[]>([]);
  const [pendingReminder, setPendingReminder] = useState<Reminder | null>(null);
  const [simulationMode, setSimulationModeState] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [careTargets, setCareTargets] = useState<CareTargets | null>(null);
  const [speciesName, setSpeciesName] = useState<string>('Philodendron Birkin');
  
  // Refs to track previous values for change detection
  const prevEmotionRef = useRef<EmotionState>('I_AM_OKAY');
  const prevScoresRef = useRef<PlantScores | null>(null);
  const prevMetricsRef = useRef<ComfortMetrics | null>(null);
  const realtimeOverrideRef = useRef<boolean>(false);
  // Watering/Gas indices state
  const lastWateredAtRef = useRef<number | null>(null);
  const wetStreakRef = useRef<number>(0);
  const [benchmarkDays, setBenchmarkDays] = useState<number>(8.5);
  const giRef = useRef<number>(1.0); // 0..1
  const mq2WindowRef = useRef<number[]>([]);
  const highZHitsRef = useRef<number>(0);
  // Wind (BioAmp EXG) disturbance factor (1 calm .. lower = disturbance)
  const windFactorRef = useRef<number>(1.0);
  
  // Compute scores from raw vitals (defined first so it can be used in initialization)
  const computeScores = useCallback((raw: PlantVitalsRaw): PlantScores => {
    const hydrationScore = computeHydrationScore(raw.soilMoisture, raw.raindrop);
    const comfortScore = computeComfortScore(raw.temperature, raw.humidity);
    const airQualityScore = computeAirQualityScore(raw.mq2);
    const bioSignalScore = computeBioSignalScore(raw.bio);

    return {
      hydrationScore,
      comfortScore,
      airQualityScore,
      bioSignalScore,
    };
  }, []);

  // Care target defaults (used if we don't have API-provided benchmarks yet)
  const CARE_DEFAULTS: CareTargets = {
    max_temp: 32,
    min_temp: 10,
    max_env_humid: 85,
    min_env_humid: 30,
    max_soil_moist: 60,
    min_soil_moist: 15,
  };

  // Load selected species, then hydrate care targets from Plantbook cache
  useEffect(() => {
    const PB_CACHE_PREFIX = 'pb:v1:';
    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
    (async () => {
      try {
        const sel = (await AsyncStorage.getItem('selectedSpeciesName')) || speciesName;
        setSpeciesName(sel);
        const key = PB_CACHE_PREFIX + normalize(sel);
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const pb = JSON.parse(raw) as Partial<CareTargets> & { [k: string]: any };
          const next: CareTargets = {
            max_temp: pb.max_temp ?? CARE_DEFAULTS.max_temp,
            min_temp: pb.min_temp ?? CARE_DEFAULTS.min_temp,
            max_env_humid: pb.max_env_humid ?? CARE_DEFAULTS.max_env_humid,
            min_env_humid: pb.min_env_humid ?? CARE_DEFAULTS.min_env_humid,
            max_soil_moist: pb.max_soil_moist ?? CARE_DEFAULTS.max_soil_moist,
            min_soil_moist: pb.min_soil_moist ?? CARE_DEFAULTS.min_soil_moist,
          };
          setCareTargets(next);
        }
      } catch {
        // ignore cache errors; keep defaults
      }
    })();
  }, []);

  // Calibrations and smoothing for real-time signals
  const SOIL_CAL_DRY = 850; // ADC when very dry
  const SOIL_CAL_WET = 400; // ADC when fully wet
  const ALPHA = 0.2;        // EMA smoothing
  const DELTA_INDEX = 0.03; // 3% change threshold for indices
  const DELTA_SOILPCT = 2;  // 2 percentage points for soil %

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  const mapRange = (value: number, inMin: number, inMax: number, outMin: number, outMax: number) => {
    if (inMax === inMin) return outMin;
    const t = (value - inMin) / (inMax - inMin);
    return outMin + t * (outMax - outMin);
  };

  const computeComfortMetrics = useCallback((raw: PlantVitalsRaw, care: CareTargets = CARE_DEFAULTS): ComfortMetrics => {
    // Soil % from ADC using calibration
    const soilPercent = clamp(mapRange(raw.soilMoisture, SOIL_CAL_DRY, SOIL_CAL_WET, 0, 100), 0, 100);
    const moistureIndex = clamp((soilPercent - care.min_soil_moist) / (care.max_soil_moist - care.min_soil_moist), 0, 1);

    // Temperature comfort index
    const tOpt = (care.max_temp + care.min_temp) / 2;
    const tHalf = (care.max_temp - care.min_temp) / 2 || 1;
    const tempComfortIndex = clamp(1 - Math.abs(raw.temperature - tOpt) / tHalf, 0, 1);

    // Humidity comfort index
    const hOpt = (care.max_env_humid + care.min_env_humid) / 2;
    const hHalf = (care.max_env_humid - care.min_env_humid) / 2 || 1;
    const humidityComfortIndex = clamp(1 - Math.abs(raw.humidity - hOpt) / hHalf, 0, 1);

    // PCS is computed later with Wi/Gi modifiers; initialize as base for now
    const pcs = clamp(0.4 * moistureIndex + 0.3 * tempComfortIndex + 0.3 * humidityComfortIndex, 0, 1);

    return { moistureIndex, tempComfortIndex, humidityComfortIndex, pcs, soilPercent };
  }, []);

  // Initialize MQ-2 baseline and compute initial state
  useEffect(() => {
    setMq2Baseline(70); // Baseline is 70 per guidelines (normal reading ~70)
    // Compute initial state from default vitals
    const initialScores = computeScores(DEFAULT_RAW_VITALS);
    const initialMetrics = computeComfortMetrics(DEFAULT_RAW_VITALS, careTargets ?? CARE_DEFAULTS);
    const initialMood = deriveMood(initialScores);
    const initialEmotion = deriveEmotionState(initialScores, DEFAULT_RAW_VITALS);
    const initialState = computePlantCurrentState(DEFAULT_RAW_VITALS);
    
    setScores(initialScores);
    setMetrics(initialMetrics);
    setMood(initialMood);
    setEmotion(initialEmotion);
    setCurrentState(initialState);
    prevEmotionRef.current = initialEmotion;
    prevScoresRef.current = initialScores;
    prevMetricsRef.current = initialMetrics;
    
    // Set initial vitals for display
    setVitals({
      health: Math.round((initialScores.hydrationScore + initialScores.comfortScore + initialScores.airQualityScore) / 3),
      water: initialScores.hydrationScore,
      sunlight: initialScores.comfortScore,
      soil: initialScores.hydrationScore,
    });
  }, [computeScores, computeComfortMetrics, careTargets]);

  // Load persisted watering info and set benchmark from Perenual if available
  useEffect(() => {
    (async () => {
      try {
        const sel = (await AsyncStorage.getItem('selectedSpeciesName')) || speciesName;
        const norm = sel.replace(/\s+/g, ' ').trim().toLowerCase();
        const lastKey = `watering:last:${norm}`;
        const benchKey = `watering:benchDays:${norm}`;
        const [lastRaw, benchRaw] = await Promise.all([
          AsyncStorage.getItem(lastKey),
          AsyncStorage.getItem(benchKey),
        ]);
        if (lastRaw) {
          const t = parseInt(lastRaw, 10);
          if (!isNaN(t)) lastWateredAtRef.current = t;
        }
        if (benchRaw) {
          const d = parseFloat(benchRaw);
          if (!isNaN(d) && d > 0.1) setBenchmarkDays(d);
        }
        // Try fetch from Perenual for selected species
        try {
          const care = await fetchCareFieldsForName(sel, sel.split(' ')[0]);
          const v = care?.watering_general_benchmark?.value;
          const u = care?.watering_general_benchmark?.unit;
          const d = parseBenchmarkDays(v ?? null, u ?? null);
          if (d && d > 0.1) {
            setBenchmarkDays(d);
            await AsyncStorage.setItem(benchKey, String(d));
          }
        } catch {}
        if (!lastWateredAtRef.current) {
          const now = Date.now();
          lastWateredAtRef.current = now;
          await AsyncStorage.setItem(lastKey, String(now));
        }
      } catch {}
    })();
  }, []);

  // Update computed state from raw vitals
  const updateStateFromRawVitals = useCallback((raw: PlantVitalsRaw) => {
    const newScores = computeScores(raw);
    const newMetrics = computeComfortMetrics(raw, careTargets ?? CARE_DEFAULTS);
    // --- Watering index Wi (0..1) with decay and soil gating
    const nowMs = Date.now();
    const RAINDROP_PARTIAL_THRESHOLD = 400; // partial contact 250-400, fully wet <150
    const REQUIRED_WET_STREAK = 3; // samples
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    if (raw.raindrop < RAINDROP_PARTIAL_THRESHOLD) {
      wetStreakRef.current += 1;
    } else {
      wetStreakRef.current = 0;
    }
    if (wetStreakRef.current >= REQUIRED_WET_STREAK) {
      lastWateredAtRef.current = nowMs;
      wetStreakRef.current = 0;
      // Persist last watered timestamp for selected species
      (async () => {
        try {
          const sel = (await AsyncStorage.getItem('selectedSpeciesName')) || speciesName;
          const norm = sel.replace(/\s+/g, ' ').trim().toLowerCase();
          await AsyncStorage.setItem(`watering:last:${norm}`, String(nowMs));
        } catch {}
      })();
    }
    let wi = 0;
    if (lastWateredAtRef.current) {
      const tDays = (nowMs - lastWateredAtRef.current) / MS_PER_DAY;
      const wiRaw = Math.max(0, 1 - tDays / Math.max(0.1, benchmarkDays));
      wi = Math.min(wiRaw, newMetrics.moistureIndex); // soil gating (Mi in 0..1)
    }

    // --- Gas quality index Gi (0..1) spike detection + slow recovery
    const Z_TRIG = 3.0;
    const WINDOW = 60; // samples
    const REQUIRED_SPIKE_HITS = 3;
    const RECENT_WINDOW = 5;
    const RECOVERY_ALPHA = 0.01; // per update

    const w = mq2WindowRef.current;
    w.push(raw.mq2);
    if (w.length > WINDOW) w.shift();
    const mean = w.reduce((a, b) => a + b, 0) / Math.max(1, w.length);
    const variance = w.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(1, w.length - 1);
    const std = Math.sqrt(Math.max(variance, 1e-6));
    const z = (raw.mq2 - mean) / std;
    if (z >= Z_TRIG) highZHitsRef.current += 1; else if (highZHitsRef.current > 0) highZHitsRef.current -= 1;
    highZHitsRef.current = Math.min(highZHitsRef.current, RECENT_WINDOW);
    if (highZHitsRef.current >= REQUIRED_SPIKE_HITS) {
      giRef.current = Math.min(giRef.current, 0.2);
      highZHitsRef.current = 0;
    } else {
      giRef.current = Math.min(1, giRef.current + (1 - giRef.current) * RECOVERY_ALPHA);
    }
    const gi = giRef.current;

    // --- Wind disturbance via BioAmp EXG (instant visible effect + quick recovery)
    // Use existing state mapping for spikes/deviations
    const bioState = computeBioSignalState(raw.bio);
    const WIND_HIT_FACTOR = 0.85; // immediate 15% drop when wind detected
    const WIND_RECOVERY_ALPHA = 0.05; // recover ~5% of remaining gap per update
    if (bioState === 'wind_trigger') {
      windFactorRef.current = Math.min(windFactorRef.current, WIND_HIT_FACTOR);
    } else {
      windFactorRef.current = Math.min(1, windFactorRef.current + (1 - windFactorRef.current) * WIND_RECOVERY_ALPHA);
    }
    const windFactor = windFactorRef.current;

    // --- Multiplicative PCS with Wi/Gi modifiers
    const comfortBase = 0.5 * newMetrics.moistureIndex + 0.25 * newMetrics.tempComfortIndex + 0.25 * newMetrics.humidityComfortIndex;
    const waterFactor = 0.90 + 0.10 * Math.min(wi, newMetrics.moistureIndex);
    const gasFactor = 0.70 + 0.30 * gi;
    const pcsMul = clamp(comfortBase * waterFactor * gasFactor * windFactor, 0, 1);
    newMetrics.pcs = pcsMul;
    const newMood = deriveMood(newScores);
    const newEmotion = deriveEmotionState(newScores, raw);
    const newCurrentState = computePlantCurrentState(raw);

    setScores(newScores);
    setMood(newMood);
    setEmotion(newEmotion);
    setCurrentState(newCurrentState);

    // Update vitals for display (convert scores to 0-100 scale)
    // Health is average of hydration, comfort, and air quality
    setVitals({
      health: Math.round((newScores.hydrationScore + newScores.comfortScore + newScores.airQualityScore) / 3),
      water: newScores.hydrationScore,
      sunlight: newScores.comfortScore,
      soil: newScores.hydrationScore, // Using hydration for soil bar (they're the same metric)
    });

    // Check for emotion changes and add to event log
    if (newEmotion !== prevEmotionRef.current) {
      const message = getEmotionMessage(newEmotion);
      const event: PlantEvent = {
        id: `event-${Date.now()}-${Math.random()}`,
        type: newEmotion === 'I_AM_BEING_WATERED' ? 'watered' : 'warning',
        message,
        timestamp: new Date(),
      };

      setEventLog((prev) => [event, ...prev].slice(0, 20)); // Keep last 20 events
      prevEmotionRef.current = newEmotion;
    }

    // Update reminder based on scores
    if (newScores.hydrationScore < 30) {
      setPendingReminder({
        id: 'reminder-water',
        type: 'water',
        message: 'Time to water your plant!',
        dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
        isUrgent: newScores.hydrationScore < 10,
      });
    } else if (
      newScores.hydrationScore >= 60 &&
      newScores.comfortScore >= 60 &&
      newScores.airQualityScore >= 50 &&
      newScores.bioSignalScore >= 30
    ) {
      setPendingReminder(null);
    }

    // Smooth + threshold update for metrics to avoid noisy UI changes
    const prevM = prevMetricsRef.current;
    if (!prevM) {
      setMetrics(newMetrics);
      prevMetricsRef.current = newMetrics;
    } else {
      const smooth: ComfortMetrics = {
        moistureIndex: prevM.moistureIndex * (1 - ALPHA) + newMetrics.moistureIndex * ALPHA,
        tempComfortIndex: prevM.tempComfortIndex * (1 - ALPHA) + newMetrics.tempComfortIndex * ALPHA,
        humidityComfortIndex: prevM.humidityComfortIndex * (1 - ALPHA) + newMetrics.humidityComfortIndex * ALPHA,
        pcs: prevM.pcs * (1 - ALPHA) + newMetrics.pcs * ALPHA,
        soilPercent: prevM.soilPercent * (1 - ALPHA) + newMetrics.soilPercent * ALPHA,
      };

      const major = (
        Math.abs(smooth.moistureIndex - prevM.moistureIndex) > DELTA_INDEX ||
        Math.abs(smooth.tempComfortIndex - prevM.tempComfortIndex) > DELTA_INDEX ||
        Math.abs(smooth.humidityComfortIndex - prevM.humidityComfortIndex) > DELTA_INDEX ||
        Math.abs(smooth.pcs - prevM.pcs) > DELTA_INDEX ||
        Math.abs(smooth.soilPercent - prevM.soilPercent) > DELTA_SOILPCT
      );

      if (major || realtimeOverrideRef.current) {
        setMetrics(smooth);
        prevMetricsRef.current = smooth;
      }
    }

    prevScoresRef.current = newScores;
  }, [computeScores, computeComfortMetrics, careTargets]);

  // Handle sensor data from WebSocket - use ref to avoid dependency issues
  const handleSensorUpdateRef = useRef<((sensorState: SensorState) => void) | undefined>(undefined);

  // Update the ref when updateStateFromRawVitals changes
  useEffect(() => {
    handleSensorUpdateRef.current = (sensorState: SensorState) => {
      const raw: PlantVitalsRaw = {
        soilMoisture: sensorState.soil,
        temperature: sensorState.temp,
        humidity: sensorState.hum,
        mq2: sensorState.mq2,
        raindrop: sensorState.rain,
        bio: sensorState.bio,
        timestamp: new Date(),
      };

      setRawVitals(raw);
      updateStateFromRawVitals(raw);
    };
  }, [updateStateFromRawVitals]);

  // Stable callback that uses the ref
  const handleSensorUpdate = useCallback((sensorState: SensorState) => {
    handleSensorUpdateRef.current?.(sensorState);
  }, []);

  // WebSocket connection - only depend on simulationMode
  useEffect(() => {
    if (simulationMode) {
      // Don't connect in simulation mode
      dataClient.disconnect();
      return;
    }

    // Determine WebSocket URL
    // Priority:
    // 1. ADB port forwarding (localhost) - if using USB + ADB reverse
    // 2. Development machine IP from Expo - for WiFi connection
    // 3. Emulator address (10.0.2.2) - for Android emulator
    // 4. Localhost - for iOS simulator/web
    let wsUrl = 'ws://localhost:4000/ws';
    // Allow explicit override via env or app.json extra
    let overrideActive = false;
    try {
      const extra: any = (Constants as any).expoConfig?.extra || {};
      const override = extra.expoPublicWsUrl || (process as any).env?.EXPO_PUBLIC_WS_URL;
      if (override && typeof override === 'string') {
        wsUrl = override;
        overrideActive = true;
        console.log('WS override in use:', wsUrl);
      }
    } catch {}
    
    if (Platform.OS === 'android' && !overrideActive) {
      // Check if running in Expo Go or development build
      // Try multiple ways to get the development server URL
      const expoConfig = Constants.expoConfig;
      const manifest = (Constants as any).manifest;
      
      // Get host URI from expoConfig or manifest
      const hostUri = expoConfig?.hostUri || manifest?.hostUri || manifest?.extra?.expoGo?.hostUri;
      
      if (hostUri) {
        // Extract IP from Expo URL (e.g., "10.80.232.168:8082" -> "10.80.232.168")
        const ipMatch = hostUri.match(/(\d+\.\d+\.\d+\.\d+):\d+/);
        if (ipMatch) {
          wsUrl = `ws://${ipMatch[1]}:4000/ws`;
          console.log('🌐 Using WiFi connection - Development machine IP:', wsUrl);
          console.log('   Extracted from Expo hostUri:', hostUri);
          if ((ipMatch[1] === '127.0.0.1') || (ipMatch[1] === 'localhost')) {
            console.log('Note: 127.0.0.1 on a physical device requires adb reverse tcp:4000 tcp:4000 OR set extra.expoPublicWsUrl to ws://<your-ip>:4000/ws');
          }
        } else {
          // Fallback to emulator address
          wsUrl = 'ws://10.0.2.2:4000/ws';
          console.log('📱 Using emulator address (could not parse IP from hostUri):', wsUrl);
          console.log('   hostUri was:', hostUri);
        }
      } else {
        // No hostUri found - could be production build, emulator, or ADB port forwarding
        // For physical devices, we need the actual IP. For emulator, use 10.0.2.2
        // Try emulator address as fallback
        wsUrl = 'ws://10.0.2.2:4000/ws';
        console.log('📱 Using emulator address (no Expo hostUri found):', wsUrl);
        console.log('   This works for Android emulator.');
        console.log('   For physical device: ensure same WiFi network and server binds to 0.0.0.0');
        console.log('   For ADB port forwarding: use "adb reverse tcp:4000 tcp:4000" then modify code to use localhost');
      }
    }

    dataClient.init(wsUrl);
    dataClient.connect(handleSensorUpdate);

    // Subscribe to status changes
    const unsubscribe = dataClient.onStatusChange((status) => {
      setConnectionStatus(status);
    });

    return () => {
      unsubscribe();
      dataClient.disconnect();
    };
    // Only re-run if simulationMode changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationMode]);

  // Set simulation mode
  const setSimulationMode = useCallback((enabled: boolean) => {
    setSimulationModeState(enabled);
    if (enabled) {
      dataClient.disconnect();
      setConnectionStatus('idle');
    }
  }, []);

  // Set simulated vitals
  const setSimulatedVitals = useCallback((vitals: Partial<SensorState>) => {
    if (!simulationMode) return;

    const updated: PlantVitalsRaw = {
      ...rawVitals,
      soilMoisture: vitals.soil ?? rawVitals.soilMoisture,
      temperature: vitals.temp ?? rawVitals.temperature,
      humidity: vitals.hum ?? rawVitals.humidity,
      mq2: vitals.mq2 ?? rawVitals.mq2,
      raindrop: vitals.rain ?? rawVitals.raindrop,
      bio: vitals.bio ?? rawVitals.bio,
      timestamp: new Date(),
    };

    setRawVitals(updated);
    updateStateFromRawVitals(updated);
  }, [simulationMode, rawVitals, updateStateFromRawVitals]);

  // Map connection status to PlantStatus
  const getPlantStatus = (): ConnectionStatus => {
    return connectionStatus;
  };

  return {
    vitals,
    rawVitals, // Expose raw sensor values
    scores,
    metrics,
    careTargets,
    mood,
    emotion,
    currentState,
    eventLog,
    pendingReminder,
    simulationMode,
    connectionStatus,
    setRealtimeMode: (enabled: boolean) => { realtimeOverrideRef.current = !!enabled; },
    setSimulationMode,
    setSimulatedVitals,
    id: 'plant-1',
    name: 'My Plant',
    species: 'Philodendron Birkin',
    status: getPlantStatus(),
    level: 1,
  };
}
