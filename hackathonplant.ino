#include <DHT.h>

// Pins
const int RAIN_PIN = A0;
const int SOIL_PIN = A1;
const int BIO_PIN  = A2;   // BioAmp EXG analog output
const int MQ2_PIN  = A3;
const int DHTPIN   = 2;
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(9600);
  dht.begin();
  delay(2000);
}

void loop() {
  // Read sensors
  int soil = analogRead(SOIL_PIN);
  int rain = analogRead(RAIN_PIN);
  int mq2  = analogRead(MQ2_PIN);
  int bio  = analogRead(BIO_PIN); // raw EEG value (0–1023)

  float temp = dht.readTemperature(); // Celsius
  float hum  = dht.readHumidity();    // %

  // Handle invalid DHT readings
  if (isnan(temp)) temp = 0;
  if (isnan(hum)) hum = 0;

  // Build line string
  String line = "STATE;";
  line += "soil=" + String(soil) + ";";
  line += "temp=" + String(temp, 1) + ";";
  line += "hum=" + String(hum, 1) + ";";
  line += "mq2=" + String(mq2) + ";";
  line += "rain=" + String(rain) + ";";
  line += "bio=" + String(bio);

  // Build JSON string
  String json = "{";
  json += "\"soil\":" + String(soil) + ",";
  json += "\"temp\":" + String(temp, 1) + ",";
  json += "\"hum\":" + String(hum, 1) + ",";
  json += "\"mq2\":" + String(mq2) + ",";
  json += "\"rain\":" + String(rain) + ",";
  json += "\"bio\":" + String(bio);
  json += "}";

  // Print final output
  Serial.print("{\n  \"line\": \"");
  Serial.print(line);
  Serial.print("\",\n  \"json\": ");
  Serial.print(json);
  Serial.println("\n}");

  delay(1000);  // update every second
}
