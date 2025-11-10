/**
 * Type definitions for plant-related data structures
 * These types define the expected interfaces for components from Dev A, B, and C
 */

export type PlantStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export type PlantMood = 'happy' | 'sad' | 'neutral' | 'thirsty' | 'needs-sun' | 'critical' | 'stressed' | 'thriving' | 'ok';

// New state system based on sensor guidelines
export type TemperatureState = 'cold_animation' | 'hot_animation' | 'stable_animation';
export type HumidityState = 'humid' | 'dry_air' | 'normal_air';
export type SoilMoistureState = 'dry' | 'thirsty' | 'okay' | 'hydrated';
export type BioSignalState = 'wind_trigger' | 'rest';
export type AirQualityState = 'air_good' | 'air_bad' | 'dizzy' | 'polluted';

// Legacy emotion state (keeping for compatibility, but will be derived from new states)
export type EmotionState =
  | 'I_FEEL_GREAT'
  | 'I_AM_OKAY'
  | 'I_NEED_WATER'
  | 'I_AM_BEING_WATERED'
  | 'I_AM_NEARLY_DEAD'
  | 'I_FEEL_HOT'
  | 'I_FEEL_COLD'
  | 'I_AM_SWEATING_THIS_IS_TOO_HUMID'
  | 'AIR_FEELS_BAD'
  | 'CHECK_MY_CONNECTION';

export interface PlantVitals {
  health: number; // 0-100
  water: number; // 0-100
  sunlight: number; // 0-100
  soil: number; // 0-100
}

export interface PlantState {
  id: string;
  name: string;
  species?: string;
  mood: PlantMood;
  emotion: EmotionState;
  vitals: PlantVitals;
  status: PlantStatus;
  level?: number;
  lastWatered?: Date;
  lastChecked?: Date;
}

// Raw sensor readings from WebSocket
export interface SensorState {
  soil: number;      // raw 0-1023 (A1 - Soil Moisture Sensor)
  temp: number;      // °C (DHT11 - Temperature)
  hum: number;       // % RH (DHT11 - Humidity)
  mq2: number;       // raw 0-1023 (A3 - MQ2 Gas Sensor)
  rain: number;      // raw 0-1023 (A0 - Raindrop Sensor)
  bio: number;       // raw 0-1023 (A2 - BioAmp EXG Sensor)
}

// Raw vitals with timestamp
export interface PlantVitalsRaw {
  soilMoisture: number;
  temperature: number;
  humidity: number;
  mq2: number;
  raindrop: number;
  bio: number;
  timestamp: Date;
}

// Computed scores (0-100)
export interface PlantScores {
  hydrationScore: number;
  comfortScore: number;
  airQualityScore: number;
  bioSignalScore: number;
}

export interface PlantEvent {
  id: string;
  type: 'watered' | 'checked' | 'level-up' | 'warning' | 'error';
  message: string;
  timestamp: Date;
}

// Current plant state based on sensor guidelines
export interface PlantCurrentState {
  temperature: TemperatureState;
  humidity: HumidityState;
  soilMoisture: SoilMoistureState;
  bioSignal: BioSignalState;
  airQuality: AirQualityState;
  isWatering: boolean; // true if raindrop < 300 (watering animation trigger)
  stateText: string; // Combined state text for UI display
}

export interface Reminder {
  id: string;
  type: 'water' | 'check' | 'fertilize';
  message: string;
  dueDate: Date;
  isUrgent?: boolean;
}

