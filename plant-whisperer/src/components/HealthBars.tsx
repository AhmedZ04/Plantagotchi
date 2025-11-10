/**
 * HealthBars component - Pixel art game style
 * Matches the exact theme from the reference image:
 * - Diamond-shaped icon module on the left
 * - Arrow-tapered progress bar on the right
 * - Double borders (dark outer, gold inner)
 * - Gradient fills
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PlantScores } from '../types/plant';
import { colors, spacing, typography } from '../theme';
import { PixelIcon } from './PixelIcon';

interface HealthBarsProps {
  scores: PlantScores | null;
}

export function HealthBars({ scores }: HealthBarsProps) {
  const barHeight = 40; // Reduced height for pixel art bars
  const iconSize = barHeight; // Icon module is square

  if (!scores) {
    return null; // Don't render if scores not available
  }

  const getBarConfig = (type: 'hydration' | 'comfort' | 'airQuality' | 'bioLink'): {
    fillColor: string;
    fillLight: string;
    fillDark: string;
    iconType: 'health' | 'water' | 'sunlight' | 'soil' | 'bioLink';
    label: string;
  } => {
    switch (type) {
      case 'hydration':
        return {
          fillColor: colors.healthBarBlue,
          fillLight: colors.healthBarBlueLight,
          fillDark: colors.healthBarBlueDark,
          iconType: 'water',
          label: 'Hydration',
        };
      case 'comfort':
        return {
          fillColor: colors.healthBarGreen,
          fillLight: colors.healthBarGreenLight,
          fillDark: colors.healthBarGreenDark,
          iconType: 'sunlight',
          label: 'Comfort',
        };
      case 'airQuality':
        return {
          fillColor: colors.healthBarRed,
          fillLight: colors.healthBarRedLight,
          fillDark: colors.healthBarRedDark,
          iconType: 'health',
          label: 'Air Quality',
        };
      case 'bioLink':
        return {
          fillColor: colors.healthBarBrown,
          fillLight: colors.healthBarBrownLight,
          fillDark: colors.healthBarBrownDark,
          iconType: 'bioLink',
          label: 'Bio Link',
        };
    }
  };

  const renderHealthBar = (
    type: 'hydration' | 'comfort' | 'airQuality' | 'bioLink',
    value: number,
    key: string
  ) => {
    const config = getBarConfig(type);
    // Clamp value to 0-100 for display
    const displayValue = Math.max(0, Math.min(100, value));

    return (
      <View key={key} style={styles.barContainer}>
        {/* Label */}
        <Text style={styles.barLabel}>{config.label}</Text>
        
        {/* Bar Row */}
        <View style={styles.barWrapper}>
          {/* Icon Module - Diamond shape with extended points */}
          <View style={[styles.iconModule, { width: iconSize, height: iconSize }]}>
            {/* Outer dark border */}
            <View style={[styles.iconOuterBorder, { width: iconSize, height: iconSize }]} />
            {/* Inner gold frame */}
            <View style={[styles.iconInnerFrame, { width: iconSize - 8, height: iconSize - 8 }]} />
            {/* Background */}
            <View style={[styles.iconBackground, { width: iconSize - 12, height: iconSize - 12 }]} />
            {/* Icon */}
            <View style={styles.iconContainer}>
              <PixelIcon type={config.iconType} size={iconSize - 16} />
            </View>
          </View>

          {/* Progress Bar - Arrow/Banner shape */}
          <View style={[styles.progressBarWrapper, { height: barHeight }]}>
          {/* Outer dark border */}
          <View style={[styles.barOuterBorder, { height: barHeight }]} />
          
          {/* Inner gold frame */}
          <View style={[styles.barInnerFrame, { height: barHeight - 6 }]} />
          
          {/* Bar content area */}
          <View style={[styles.barContent, { height: barHeight - 10 }]}>
            {/* Fill with gradient effect */}
            <View 
              style={[
                styles.barFillContainer, 
                { 
                  width: `${displayValue}%`,
                  height: '100%',
                }
              ]}>
              {/* Main fill */}
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: config.fillColor,
                    height: '100%',
                    width: '100%',
                  },
                ]}
              />
              {/* Top gradient highlight (lighter) */}
              <View
                style={[
                  styles.barFillTop,
                  {
                    backgroundColor: config.fillLight,
                    height: '30%',
                    width: '100%',
                  },
                ]}
              />
            </View>
            
            {/* Empty area (darker) */}
            <View
              style={[
                styles.barEmpty,
                {
                  backgroundColor: config.fillDark,
                  width: `${100 - displayValue}%`,
                  height: '100%',
                },
              ]}
            />
          </View>

          {/* Arrow point on the right - created using two triangles */}
          <View style={[styles.arrowPointContainer, { height: barHeight }]}>
            <View style={styles.arrowPointTop} />
            <View style={styles.arrowPointBottom} />
          </View>
        </View>
        </View>
      </View>
    );
  };

  return (
    <>
      {renderHealthBar('hydration', scores.hydrationScore, 'hydration')}
      {renderHealthBar('comfort', scores.comfortScore, 'comfort')}
      {renderHealthBar('airQuality', scores.airQualityScore, 'airQuality')}
      {renderHealthBar('bioLink', scores.bioSignalScore, 'bioLink')}
    </>
  );
}

const styles = StyleSheet.create({
  barContainer: {
    marginBottom: spacing.sm,
  },
  barLabel: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
    fontFamily: 'monospace', // Pixel art font
    fontSize: 12,
  },
  barWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // Icon Module Styles
  iconModule: {
    position: 'relative',
    transform: [{ rotate: '45deg' }], // Rotate to diamond shape
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOuterBorder: {
    position: 'absolute',
    backgroundColor: colors.healthBarOuterBorder,
    borderRadius: 0,
    borderWidth: 0,
  },
  iconInnerFrame: {
    position: 'absolute',
    backgroundColor: colors.healthBarInnerFrame,
    borderRadius: 0,
    alignSelf: 'center',
    top: 4,
    left: 4,
  },
  iconBackground: {
    position: 'absolute',
    backgroundColor: colors.healthBarIconBg,
    borderRadius: 0,
    alignSelf: 'center',
    top: 6,
    left: 6,
  },
  iconContainer: {
    position: 'absolute',
    transform: [{ rotate: '-45deg' }], // Counter-rotate icon
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Progress Bar Styles
  progressBarWrapper: {
    flex: 1,
    position: 'relative',
    flexDirection: 'row',
  },
  barOuterBorder: {
    position: 'absolute',
    width: '100%',
    backgroundColor: colors.healthBarOuterBorder,
    borderRadius: 0,
    borderWidth: 0,
    height: '100%',
  },
  barInnerFrame: {
    position: 'absolute',
    left: 3,
    right: 17, // Leave space for arrow point (14 + 3)
    backgroundColor: colors.healthBarInnerFrame,
    borderRadius: 0,
    top: 3,
    borderWidth: 0,
  },
  barContent: {
    position: 'absolute',
    left: 5,
    right: 19, // Leave space for arrow point (14 + 5)
    flexDirection: 'row',
    top: 5,
    borderRadius: 0,
    overflow: 'hidden',
  },
  barFillContainer: {
    height: '100%',
    position: 'relative',
    borderRadius: 0,
  },
  barFill: {
    borderRadius: 0,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  barFillTop: {
    borderRadius: 0,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  barEmpty: {
    borderRadius: 0,
  },
  arrowPointContainer: {
    position: 'absolute',
    right: 0,
    width: 14,
    overflow: 'hidden',
  },
  arrowPointTop: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderLeftColor: colors.healthBarOuterBorder,
    borderTopWidth: 20,
    borderTopColor: 'transparent',
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
    borderRightWidth: 0,
    borderRightColor: 'transparent',
  },
  arrowPointBottom: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderLeftColor: colors.healthBarOuterBorder,
    borderBottomWidth: 20,
    borderBottomColor: 'transparent',
    borderTopWidth: 0,
    borderTopColor: 'transparent',
    borderRightWidth: 0,
    borderRightColor: 'transparent',
  },
});
