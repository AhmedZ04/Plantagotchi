/**
 * Sensor Detail Dialog Component
 * Shows a popup dialog with vertical meter and sensor values when a sensor icon is long-pressed
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { colors, spacing, typography } from '../theme';
import { PixelIcon } from './PixelIcon';

interface SensorDetailDialogProps {
  visible: boolean;
  onClose: () => void;
  sensorType: 'soil' | 'temp' | 'hum' | 'mq2';
  sensorValue: number;
  sensorScore: number; // 0-100 optimality score
  isOptimal: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export function SensorDetailDialog({
  visible,
  onClose,
  sensorType,
  sensorValue,
  sensorScore,
  isOptimal,
}: SensorDetailDialogProps) {
  const getSensorInfo = () => {
    switch (sensorType) {
      case 'soil':
        return {
          label: 'Soil Moisture',
          unit: '',
          iconType: 'soil' as const,
          optimalRange: '400-699',
          description: 'Raw sensor reading (0-1023)',
        };
      case 'temp':
        return {
          label: 'Temperature',
          unit: '°C',
          iconType: 'sunlight' as const,
          optimalRange: '13-27°C',
          description: 'Temperature in Celsius',
        };
      case 'hum':
        return {
          label: 'Humidity',
          unit: '%',
          iconType: 'water' as const,
          optimalRange: '40-70%',
          description: 'Relative humidity',
        };
      case 'mq2':
        return {
          label: 'Air Quality',
          unit: '',
          iconType: 'health' as const,
          optimalRange: '< 150',
          description: 'MQ-2 sensor reading (0-1023)',
        };
    }
  };

  const info = getSensorInfo();
  const displayValue = sensorType === 'temp' || sensorType === 'hum' 
    ? sensorValue.toFixed(1) 
    : Math.round(sensorValue).toString();

  // Get color based on sensor score percentage
  const getSensorColor = (percentage: number): { fill: string; fillLight: string } => {
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

  const sensorColor = getSensorColor(sensorScore);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={styles.dialog}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <PixelIcon type={info.iconType} size={32} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{info.label}</Text>
              <Text style={styles.optimalRange}>Optimal: {info.optimalRange}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Sensor Value Display */}
          <View style={styles.valueContainer}>
            <Text style={styles.valueText}>
              {displayValue}{info.unit}
            </Text>
            <Text style={styles.valueDescription}>{info.description}</Text>
            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isOptimal ? '#4caf50' : '#f44336' },
                ]}
              />
              <Text style={styles.statusText}>
                {isOptimal ? 'Optimal' : 'Not Optimal'}
              </Text>
            </View>
          </View>

          {/* Vertical Meter */}
          <View style={styles.meterContainer}>
            <Text style={styles.meterLabel}>Optimality</Text>
            <View style={styles.meterWrapper}>
              {/* SVG Background - on top to act as visual mask */}
              <Image
                source={require('../../assets/images/sensor-bar.svg')}
                style={styles.meterSvg}
                contentFit="contain"
                contentPosition="center"
              />
              
              {/* Fill container - positioned precisely to match SVG bar area */}
              <View
                style={[
                  styles.meterFillContainer,
                  {
                    // Fillable area is ~150px tall (200px total - 25px for heart - 25px top padding)
                    // Calculate height based on sensorScore percentage
                    height: (sensorScore / 100) * 150,
                  },
                ]}
              >
                {/* Colored fill overlay - fills from bottom */}
                <View
                  style={[
                    styles.meterFillOverlay,
                    {
                      height: '100%',
                      backgroundColor: sensorColor.fill,
                      opacity: 0.85,
                    },
                  ]}
                />
                
                {/* Light gradient overlay on top portion of fill */}
                <View
                  style={[
                    styles.meterFillTopOverlay,
                    {
                      backgroundColor: sensorColor.fillLight,
                      opacity: 0.6,
                    },
                  ]}
                />
              </View>
              
              {/* Percentage label */}
              <Text style={styles.meterPercentage}>{sensorScore}%</Text>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    width: Math.min(screenWidth - spacing.md * 2, 320),
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.healthBarOuterBorder,
  },
  iconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.label,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  optimalRange: {
    ...typography.label,
    fontSize: 12,
    color: colors.textSecondary,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.neutralLight,
  },
  closeButtonText: {
    fontSize: 20,
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  valueContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  valueText: {
    ...typography.label,
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  valueDescription: {
    ...typography.label,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  meterContainer: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  meterLabel: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  meterWrapper: {
    position: 'relative',
    width: 60,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  meterSvg: {
    position: 'absolute',
    width: 60,
    height: 200,
    zIndex: 10, // SVG on top to act as visual mask
  },
  meterFillContainer: {
    position: 'absolute',
    // SVG viewBox: 206 x 785, bar area: x=47, width=122.67, y=8.61, height=690.39
    // When rendered at 60x200: scaleX = 60/206 = 0.291, scaleY = 200/785 = 0.255
    // Bar left: 47 * 0.291 = 13.68px, Bar width: 122.67 * 0.291 = 35.7px
    // Bar top: 8.61 * 0.255 = 2.2px, Bar height: 690.39 * 0.255 = 176px
    // Heart is at bottom (y=584.33), so fillable area excludes bottom ~25px
    left: 13.7, // Match SVG bar start position
    bottom: 25, // Clear the heart at bottom
    width: 35.7, // Match SVG bar width
    // height will be set dynamically based on sensorScore
    borderRadius: 8, // Rounded corners to match SVG bar shape
    overflow: 'hidden', // Important for inner fills
    zIndex: 8, // Below the SVG
  },
  meterFillOverlay: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: '100%',
    // height will be set dynamically
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  meterFillTopOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: 15, // Fixed height for lighter top gradient
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  meterPercentage: {
    position: 'absolute',
    top: -30,
    ...typography.label,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    zIndex: 10, // Above all overlays
  },
});

