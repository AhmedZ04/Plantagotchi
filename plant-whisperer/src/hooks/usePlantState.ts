/**
 * Hook for managing plant state
 * Wires WebSocket, computes scores, and derives mood/emotion
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
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
import { dataClient, ConnectionStatus } from '../services/dataClient';
import {
  computeHydrationScore,
  computeComfortScore,
  computeAirQualityScore,
  computeBioSignalScore,
  deriveMood,
  deriveEmotionState,
  getEmotionMessage,
  setMq2Baseline,
  computePlantCurrentState,
} from '../services/plantModel';
import { SensorState } from '../types/plant';

interface UsePlantStateReturn {
  // State
  vitals: PlantVitals;
  rawVitals: PlantVitalsRaw; // Expose raw sensor values for HealthBars
  scores: PlantScores | null;
  mood: PlantMood;
  emotion: EmotionState;
  currentState: PlantCurrentState | null;
  eventLog: PlantEvent[];
  pendingReminder: Reminder | null;
  simulationMode: boolean;
  connectionStatus: ConnectionStatus;
  
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
  const [mood, setMood] = useState<PlantMood>('ok');
  const [emotion, setEmotion] = useState<EmotionState>('I_AM_OKAY');
  const [currentState, setCurrentState] = useState<PlantCurrentState | null>(null);
  const [vitals, setVitals] = useState<PlantVitals>(DEFAULT_VITALS);
  
  // UI state
  const [eventLog, setEventLog] = useState<PlantEvent[]>([]);
  const [pendingReminder, setPendingReminder] = useState<Reminder | null>(null);
  const [simulationMode, setSimulationModeState] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  
  // Refs to track previous values for change detection
  const prevEmotionRef = useRef<EmotionState>('I_AM_OKAY');
  const prevScoresRef = useRef<PlantScores | null>(null);
  
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

  // Initialize MQ-2 baseline and compute initial state
  useEffect(() => {
    setMq2Baseline(70); // Baseline is 70 per guidelines (normal reading ~70)
    // Compute initial state from default vitals
    const initialScores = computeScores(DEFAULT_RAW_VITALS);
    const initialMood = deriveMood(initialScores);
    const initialEmotion = deriveEmotionState(initialScores, DEFAULT_RAW_VITALS);
    const initialState = computePlantCurrentState(DEFAULT_RAW_VITALS);
    
    setScores(initialScores);
    setMood(initialMood);
    setEmotion(initialEmotion);
    setCurrentState(initialState);
    prevEmotionRef.current = initialEmotion;
    prevScoresRef.current = initialScores;
    
    // Set initial vitals for display
    setVitals({
      health: Math.round((initialScores.hydrationScore + initialScores.comfortScore + initialScores.airQualityScore) / 3),
      water: initialScores.hydrationScore,
      sunlight: initialScores.comfortScore,
      soil: initialScores.hydrationScore,
    });
  }, [computeScores]);

  // Update computed state from raw vitals
  const updateStateFromRawVitals = useCallback((raw: PlantVitalsRaw) => {
    const newScores = computeScores(raw);
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

    prevScoresRef.current = newScores;
  }, [computeScores]);

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
    
    if (Platform.OS === 'android') {
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
    mood,
    emotion,
    currentState,
    eventLog,
    pendingReminder,
    simulationMode,
    connectionStatus,
    setSimulationMode,
    setSimulatedVitals,
    id: 'plant-1',
    name: 'My Plant',
    species: 'Philodendron Birkin',
    status: getPlantStatus(),
    level: 1,
  };
}
