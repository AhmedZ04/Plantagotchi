/**
 * Sensor Detail Dialog Component
 * Shows a popup dialog with vertical meter and sensor values when a sensor icon is long-pressed
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
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

/**
 * OptimalityBar Component
 * Vertical thermometer-style bar with tick marks, styled like HealthBar but green
 */
interface OptimalityBarProps {
  percentage: number; // 0-100
}

function OptimalityBar({ percentage }: OptimalityBarProps) {
  // Clamp percentage
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  
  // Bar dimensions - vertical thermometer style
  const barWidth = 40;
  const barHeight = 200;
  const borderWidth = 3;
  const cornerRadius = barWidth / 2;
  
  // Calculate fill height (fills from bottom to top)
  const maxFillHeight = barHeight - borderWidth * 2;
  const targetFillHeight = (clampedPercentage / 100) * maxFillHeight;
  
  // Animated fill
  const animatedFillHeight = useRef(new Animated.Value(targetFillHeight)).current;
  const isInitialMount = useRef(true);
  
  // Update animation
  useEffect(() => {
    const newTargetHeight = (clampedPercentage / 100) * maxFillHeight;
    
    if (isInitialMount.current) {
      isInitialMount.current = false;
      animatedFillHeight.setValue(newTargetHeight);
      return;
    }
    
    Animated.timing(animatedFillHeight, {
      toValue: newTargetHeight,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [clampedPercentage, maxFillHeight, animatedFillHeight]);
  
  // Generate tick marks (thermometer readings)
  // Create tick marks at 0%, 20%, 40%, 60%, 80%, 100%
  const tickMarks = [0, 20, 40, 60, 80, 100];
  
  return (
    <View style={styles.optimalityBarContainer}>
      {/* White background with black border - matching HealthBar style */}
      <View style={[
        styles.optimalityBarOutline,
        {
          width: barWidth,
          height: barHeight,
          borderRadius: cornerRadius,
          borderWidth: borderWidth,
          borderColor: '#000000',
          backgroundColor: '#ffffff',
        }
      ]} />
      
      {/* Tick marks - thermometer style dashes (inside the bar only) */}
      {tickMarks.map((tick) => {
        const tickPosition = ((100 - tick) / 100) * maxFillHeight + borderWidth;
        // Only show tick marks that are within the bar bounds
        if (tickPosition >= borderWidth && tickPosition <= barHeight - borderWidth) {
          return (
            <View
              key={tick}
              style={[
                styles.optimalityBarTick,
                {
                  top: tickPosition - 1,
                  left: borderWidth,
                  width: barWidth - borderWidth * 2,
                  height: 2,
                }
              ]}
            />
          );
        }
        return null;
      })}
      
      {/* Green fill bar - animated, fills from bottom to top */}
      <Animated.View
        style={[
          styles.optimalityBarFill,
          {
            left: borderWidth,
            bottom: borderWidth,
            width: barWidth - borderWidth * 2,
            height: animatedFillHeight,
            backgroundColor: '#4caf50', // Green color
            borderBottomLeftRadius: cornerRadius - borderWidth,
            borderBottomRightRadius: cornerRadius - borderWidth,
            borderTopLeftRadius: cornerRadius - borderWidth,
            borderTopRightRadius: cornerRadius - borderWidth,
          }
        ]}
      />
      
      {/* Percentage text - positioned above the bar */}
      <Text style={styles.optimalityBarPercentage}>
        {Math.round(clampedPercentage)}%
      </Text>
    </View>
  );
}

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

  // Animation values
  const blurIntensity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [blurIntensityState, setBlurIntensityState] = React.useState(0);
  const blurIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Animate on mount/unmount - synchronized blur and dialog animations
  useEffect(() => {
    if (visible) {
      // Animate blur intensity from 0 to 120 (strong Gaussian blur like in image)
      // Using state since BlurView doesn't support Animated.Value directly
      blurIntervalRef.current = setInterval(() => {
        setBlurIntensityState((prev) => {
          if (prev >= 120) {
            if (blurIntervalRef.current) {
              clearInterval(blurIntervalRef.current);
              blurIntervalRef.current = null;
            }
            return 120;
          }
          // Smooth animation over 300ms (24 updates per 12.5ms ≈ 300ms)
          return Math.min(prev + 5, 120);
        });
      }, 12.5); // Update every 12.5ms for smooth 60fps animation

      // Animate blur opacity and dialog simultaneously
      Animated.parallel([
        Animated.timing(blurIntensity, {
          toValue: 100,
          duration: 300,
          useNativeDriver: false, // BlurView intensity can't use native driver
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset on close
      if (blurIntervalRef.current) {
        clearInterval(blurIntervalRef.current);
        blurIntervalRef.current = null;
      }
      setBlurIntensityState(0);
      blurIntensity.setValue(0);
      scale.setValue(0.8);
      opacity.setValue(0);
    }

    return () => {
      if (blurIntervalRef.current) {
        clearInterval(blurIntervalRef.current);
        blurIntervalRef.current = null;
      }
    };
  }, [visible, blurIntensity, scale, opacity]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Animated Gaussian Blur Background - actual blur effect */}
      {/* BlurView must be first to blur content behind Modal */}
      <BlurView
        intensity={blurIntensityState}
        tint="default"
        style={StyleSheet.absoluteFill}
      />
      
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        {/* Subtle dark overlay for better contrast */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: 'rgba(0, 0, 0, 0.15)',
              opacity: opacity,
            },
          ]}
        />

        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        >
          <Animated.View
            style={[
              styles.dialog,
              {
                transform: [{ scale: scale }],
                opacity: opacity,
              },
            ]}
          >
            <TouchableOpacity
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

          {/* Optimality Bar - styled like HealthBar */}
          <View style={styles.meterContainer}>
            <OptimalityBar percentage={sensorScore} />
          </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  overlayTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    width: Math.min(screenWidth - spacing.md * 2, 360),
    maxHeight: '90%',
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
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
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
  },
  valueText: {
    ...typography.label,
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    minHeight: 60,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  valueDescription: {
    ...typography.label,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
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
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  optimalityBarContainer: {
    position: 'relative',
    width: 40,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  optimalityBarOutline: {
    position: 'absolute',
    borderStyle: 'solid',
  },
  optimalityBarFill: {
    position: 'absolute',
  },
  optimalityBarTick: {
    position: 'absolute',
    backgroundColor: '#000000',
    opacity: 0.3,
    zIndex: 5,
  },
  optimalityBarPercentage: {
    position: 'absolute',
    top: -30,
    ...typography.label,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4caf50',
    fontFamily: 'monospace',
    zIndex: 10,
  },
});

