export interface SensorState {
  soil: number;      // raw 0-1023
  temp: number;      // °C
  hum: number;       // % RH
  mq2: number;       // raw 0-1023
  rain: number;      // raw 0-1023
  bio: number;       // arbitrary 0-100-ish float (signal metric)
}

export interface WireStatePayload {
  line: string;      // e.g. "STATE;soil=650;temp=24.5;hum=58.0;mq2=180;rain=900;bio=8.52"
  json: SensorState;
}

