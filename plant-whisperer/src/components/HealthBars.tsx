/**
 * HealthBars component - Revised system
 * - Single overall red health bar at top (weighted average of soil, temp, hum, mq2)
 * - Diamond icons below for each sensor (green if optimal, red if not)
 * - Long press on icons shows detail dialog with vertical meter
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { PlantScores, PlantVitalsRaw } from '../types/plant';
import { colors, spacing, typography } from '../theme';
import { PixelIcon } from './PixelIcon';
import {
  computeOverallHealth,
  isSoilOptimal,
  isTempOptimal,
  isHumOptimal,
  isMq2Optimal,
  computeHydrationScore,
  computeTempScore,
  computeHumScore,
  computeAirQualityScore,
} from '../services/plantModel';
import { SensorDetailDialog } from './SensorDetailDialog';
import { HealthBar } from './HealthBar';

interface HealthBarsProps {
  scores: PlantScores | null;
  rawVitals: PlantVitalsRaw | null;
}

export function HealthBars({ scores, rawVitals }: HealthBarsProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [selectedSensor, setSelectedSensor] = useState<'soil' | 'temp' | 'hum' | 'mq2' | null>(null);

  if (!scores || !rawVitals) {
    return null; // Don't render if scores or raw vitals not available
  }

  // Calculate overall health (weighted average of soil, temp, hum, mq2)
  const overallHealth = computeOverallHealth(
    rawVitals.soilMoisture,
    rawVitals.temperature,
    rawVitals.humidity,
    rawVitals.mq2
  );

  // Check optimality for each sensor
  const soilOptimal = isSoilOptimal(rawVitals.soilMoisture);
  const tempOptimal = isTempOptimal(rawVitals.temperature);
  const humOptimal = isHumOptimal(rawVitals.humidity);
  const mq2Optimal = isMq2Optimal(rawVitals.mq2);

  // Calculate individual sensor scores for the detail dialog
  const soilScore = computeHydrationScore(rawVitals.soilMoisture, rawVitals.raindrop);
  const tempScore = computeTempScore(rawVitals.temperature);
  const humScore = computeHumScore(rawVitals.humidity);
  const mq2Score = computeAirQualityScore(rawVitals.mq2);

  const handleLongPress = (sensorType: 'soil' | 'temp' | 'hum' | 'mq2') => {
    setSelectedSensor(sensorType);
  };

  const handleCloseDialog = () => {
    setSelectedSensor(null);
  };

  const getSensorValue = (sensorType: 'soil' | 'temp' | 'hum' | 'mq2'): number => {
    switch (sensorType) {
      case 'soil':
        return rawVitals.soilMoisture;
      case 'temp':
        return rawVitals.temperature;
      case 'hum':
        return rawVitals.humidity;
      case 'mq2':
        return rawVitals.mq2;
    }
  };

  const getSensorScore = (sensorType: 'soil' | 'temp' | 'hum' | 'mq2'): number => {
    switch (sensorType) {
      case 'soil':
        return soilScore;
      case 'temp':
        return tempScore;
      case 'hum':
        return humScore;
      case 'mq2':
        return mq2Score;
    }
  };

  const getSensorOptimal = (sensorType: 'soil' | 'temp' | 'hum' | 'mq2'): boolean => {
    switch (sensorType) {
      case 'soil':
        return soilOptimal;
      case 'temp':
        return tempOptimal;
      case 'hum':
        return humOptimal;
      case 'mq2':
        return mq2Optimal;
    }
  };

  // Get color based on health percentage
  const getHealthColor = (percentage: number): { fill: string; fillLight: string } => {
    if (percentage >= 70) {
      // Green (good)
      return { fill: '#4caf50', fillLight: '#66bb6a' };
    } else if (percentage >= 40) {
      // Yellow (okay)
      return { fill: '#ffb74d', fillLight: '#ffcc80' };
    } else {
      // Red (poor)
      return { fill: '#f44336', fillLight: '#e53935' };
    }
  };

  // Render overall health bar
  const renderOverallHealthBar = () => {
    const displayValue = Math.max(0, Math.min(100, overallHealth));

    return (
      <View style={styles.overallHealthContainer}>
        <Text style={styles.overallHealthLabel}>Overall Health</Text>
        <View style={styles.overallHealthBarWrapper}>
          {/* Health bar component - handles its own percentage display */}
          <HealthBar
            healthPercentage={displayValue}
          />
        </View>
      </View>
    );
  };

  // Render sensor diamond icon
  const renderSensorIcon = (
    sensorType: 'soil' | 'temp' | 'hum' | 'mq2',
    iconType: 'soil' | 'sunlight' | 'water' | 'health',
    label: string,
    isOptimal: boolean
  ) => {
    const iconSize = 48;
    const isAir = sensorType === 'mq2';
    const isHum = sensorType === 'hum';
    const isSoil = sensorType === 'soil';
    const isTemp = sensorType === 'temp';
    const isImageSensor = isAir || isHum || isSoil || isTemp;
    const moduleSize = isImageSensor ? Math.round(iconSize * 1.6) : iconSize; // Slightly larger for Image-based icons
    const iconColor = isOptimal ? '#4caf50' : '#f44336'; // Green if optimal, red if not

    return (
      <TouchableOpacity
        style={styles.sensorIconContainer}
        onLongPress={() => handleLongPress(sensorType)}
        activeOpacity={0.7}
      >
        {/* Diamond-shaped icon module */}
        <View style={[styles.sensorIconModule, { width: moduleSize, height: moduleSize }]}>
          {!isImageSensor && (
            <>
              {/* Outer dark border */}
              <View
                style={[
                  styles.sensorIconOuterBorder,
                  {
                    width: iconSize,
                    height: iconSize,
                    borderColor: iconColor,
                  },
                ]}
              />
              {/* Inner frame */}
              <View
                style={[
                  styles.sensorIconInnerFrame,
                  {
                    width: iconSize - 8,
                    height: iconSize - 8,
                    borderColor: iconColor,
                  },
                ]}
              />
              {/* Background */}
              <View
                style={[
                  styles.sensorIconBackground,
                  {
                    width: iconSize - 12,
                    height: iconSize - 12,
                    backgroundColor: isOptimal ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                  },
                ]}
              />
            </>
          )}
          {/* Icon */}
          <View style={styles.sensorIconContainerInner}>
            {isImageSensor ? (
              <Image
                source={
                  isAir
                    ? (isOptimal
                        ? require('../../assets/images/Green_Air.png')
                        : require('../../assets/images/Red_Air.png'))
                    : isHum
                      ? (isOptimal
                          ? require('../../assets/images/Green_Humidity.png')
                          : require('../../assets/images/Red_Humidity.png'))
                      : isSoil
                        ? (isOptimal
                            ? require('../../assets/images/Green_Soil.png')
                            : require('../../assets/images/Red_Soil.png'))
                        : (isOptimal
                            ? require('../../assets/images/Green_Temp.png')
                            : require('../../assets/images/Red_Temp.png'))
                }
                // Fill the module for image-based sensors
                style={{ width: moduleSize - 4, height: moduleSize - 4 }}
                contentFit="contain"
                transition={200}
              />
            ) : (
              <PixelIcon type={iconType} size={iconSize - 16} />
            )}
          </View>
        </View>
        {/* Label */}
        <Text style={styles.sensorIconLabel}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Overall Health Bar */}
      {renderOverallHealthBar()}

      {/* Sensor Icons Row */}
      <View style={styles.sensorIconsRow}>
        {renderSensorIcon('soil', 'soil', 'Soil', soilOptimal)}
        {renderSensorIcon('temp', 'sunlight', 'Temp', tempOptimal)}
        {renderSensorIcon('hum', 'water', 'Hum', humOptimal)}
        {renderSensorIcon('mq2', 'health', 'Air', mq2Optimal)}
      </View>

      {/* Sensor Detail Dialog */}
      {selectedSensor && (
        <SensorDetailDialog
          visible={true}
          onClose={handleCloseDialog}
          sensorType={selectedSensor}
          sensorValue={getSensorValue(selectedSensor)}
          sensorScore={getSensorScore(selectedSensor)}
          isOptimal={getSensorOptimal(selectedSensor)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  overallHealthContainer: {
    marginBottom: spacing.md,
  },
  overallHealthLabel: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
  },
  overallHealthBarWrapper: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overallHealthPercentage: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -10 }],
    zIndex: 10, // Above all overlays
  },
  overallHealthPercentageText: {
    ...typography.label,
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  sensorIconsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  sensorIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sensorIconModule: {
    position: 'relative',
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  sensorIconOuterBorder: {
    position: 'absolute',
    borderWidth: 3,
    borderRadius: 0,
  },
  sensorIconInnerFrame: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 0,
    alignSelf: 'center',
    top: 4,
    left: 4,
  },
  sensorIconBackground: {
    position: 'absolute',
    borderRadius: 0,
    alignSelf: 'center',
    top: 6,
    left: 6,
  },
  sensorIconContainerInner: {
    position: 'absolute',
    transform: [{ rotate: '-45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sensorIconLabel: {
    ...typography.label,
    fontSize: 11,
    color: colors.textPrimary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
});
