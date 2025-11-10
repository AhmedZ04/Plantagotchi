/**
 * Pixel art icon component for health bars
 * Creates simple pixel art icons (heart, potion, sun, soil)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface PixelIconProps {
  type: 'health' | 'water' | 'sunlight' | 'soil' | 'bioLink';
  size?: number;
}

export function PixelIcon({ type, size = 40 }: PixelIconProps) {
  const unit = size / 8; // 8x8 grid

  const renderHeart = () => (
    <>
      {/* Heart shape - pixel art style */}
      <View style={[styles.pixel, { position: 'absolute', left: unit * 2, top: unit * 1, width: unit, height: unit, backgroundColor: colors.healthBarRed }]} />
      <View style={[styles.pixel, { position: 'absolute', left: unit * 5, top: unit * 1, width: unit, height: unit, backgroundColor: colors.healthBarRed }]} />
      <View style={[styles.pixel, { position: 'absolute', left: unit * 1, top: unit * 2, width: unit, height: unit, backgroundColor: colors.healthBarRed }]} />
      <View style={[styles.pixel, { position: 'absolute', left: unit * 3, top: unit * 2, width: unit * 2, height: unit, backgroundColor: colors.healthBarRed }]} />
      <View style={[styles.pixel, { position: 'absolute', left: unit * 6, top: unit * 2, width: unit, height: unit, backgroundColor: colors.healthBarRed }]} />
      <View style={[styles.pixel, { position: 'absolute', left: unit * 0, top: unit * 3, width: unit * 2, height: unit, backgroundColor: colors.healthBarRed }]} />
      <View style={[styles.pixel, { position: 'absolute', left: unit * 3, top: unit * 3, width: unit * 2, height: unit, backgroundColor: colors.healthBarRed }]} />
      <View style={[styles.pixel, { position: 'absolute', left: unit * 6, top: unit * 3, width: unit * 2, height: unit, backgroundColor: colors.healthBarRed }]} />
      <View style={[styles.pixel, { position: 'absolute', left: unit * 1, top: unit * 4, width: unit * 6, height: unit, backgroundColor: colors.healthBarRed }]} />
      <View style={[styles.pixel, { position: 'absolute', left: unit * 2, top: unit * 5, width: unit * 4, height: unit, backgroundColor: colors.healthBarRed }]} />
      <View style={[styles.pixel, { position: 'absolute', left: unit * 3, top: unit * 6, width: unit * 2, height: unit, backgroundColor: colors.healthBarRed }]} />
      {/* Dark outline */}
      <View style={[styles.pixel, { position: 'absolute', left: unit * 2, top: unit * 0, width: unit, height: unit, backgroundColor: colors.healthBarOuterBorder }]} />
      <View style={[styles.pixel, { position: 'absolute', left: unit * 5, top: unit * 0, width: unit, height: unit, backgroundColor: colors.healthBarOuterBorder }]} />
    </>
  );

  const renderPotion = () => (
    <>
      {/* Potion bottle - pixel art style */}
      <View style={[styles.pixel, { position: 'absolute', left: unit * 2, top: unit * 0, width: unit * 4, height: unit * 2, backgroundColor: colors.healthBarBlue }]} />
      <View style={[styles.pixel, { position: 'absolute', left: unit * 3, top: unit * 2, width: unit * 2, height: unit * 4, backgroundColor: colors.healthBarBlue }]} />
      <View style={[styles.pixel, { position: 'absolute', left: unit * 2.5, top: unit * 6, width: unit * 3, height: unit, backgroundColor: colors.healthBarBlue }]} />
      {/* Liquid inside */}
      <View style={[styles.pixel, { position: 'absolute', left: unit * 3.5, top: unit * 3, width: unit, height: unit * 2, backgroundColor: colors.healthBarBlueLight }]} />
      {/* Dark outline */}
      <View style={[styles.pixel, { position: 'absolute', left: unit * 1, top: unit * 2, width: unit, height: unit * 4, backgroundColor: colors.healthBarOuterBorder }]} />
      <View style={[styles.pixel, { position: 'absolute', left: unit * 6, top: unit * 2, width: unit, height: unit * 4, backgroundColor: colors.healthBarOuterBorder }]} />
    </>
  );

  const renderSun = () => (
    <>
      {/* Sun - pixel art style */}
      <View style={[styles.pixel, { position: 'absolute', left: unit * 2, top: unit * 2, width: unit * 4, height: unit * 4, backgroundColor: colors.healthBarGreen }]} />
      {/* Rays */}
      <View style={[styles.pixel, { position: 'absolute', left: unit * 1, top: unit * 3, width: unit, height: unit * 2, backgroundColor: colors.healthBarGreen }]} />
      <View style={[styles.pixel, { position: 'absolute', left: unit * 6, top: unit * 3, width: unit, height: unit * 2, backgroundColor: colors.healthBarGreen }]} />
      <View style={[styles.pixel, { position: 'absolute', left: unit * 3, top: unit * 1, width: unit * 2, height: unit, backgroundColor: colors.healthBarGreen }]} />
      <View style={[styles.pixel, { position: 'absolute', left: unit * 3, top: unit * 6, width: unit * 2, height: unit, backgroundColor: colors.healthBarGreen }]} />
      {/* Center */}
      <View style={[styles.pixel, { position: 'absolute', left: unit * 3, top: unit * 3, width: unit * 2, height: unit * 2, backgroundColor: colors.healthBarGreenLight }]} />
    </>
  );

  const renderSoil = () => (
    <>
      {/* Soil - pixel art style (dirt clumps) */}
      <View style={[styles.pixel, { position: 'absolute', left: unit * 1, top: unit * 2, width: unit * 2, height: unit * 2, backgroundColor: colors.healthBarBrown }]} />
      <View style={[styles.pixel, { position: 'absolute', left: unit * 3, top: unit * 3, width: unit * 2, height: unit * 2, backgroundColor: colors.healthBarBrown }]} />
      <View style={[styles.pixel, { position: 'absolute', left: unit * 5, top: unit * 2, width: unit * 2, height: unit * 2, backgroundColor: colors.healthBarBrown }]} />
      <View style={[styles.pixel, { position: 'absolute', left: unit * 2, top: unit * 4, width: unit * 4, height: unit * 2, backgroundColor: colors.healthBarBrownDark }]} />
    </>
  );

  const renderBioLink = () => (
    <>
      {/* Bio link - pixel art style (signal waves) */}
      <View style={[styles.pixel, { position: 'absolute', left: unit * 1, top: unit * 4, width: unit, height: unit * 2, backgroundColor: colors.healthBarBrown }]} />
      <View style={[styles.pixel, { position: 'absolute', left: unit * 2, top: unit * 3, width: unit, height: unit * 3, backgroundColor: colors.healthBarBrown }]} />
      <View style={[styles.pixel, { position: 'absolute', left: unit * 3, top: unit * 2, width: unit, height: unit * 4, backgroundColor: colors.healthBarBrown }]} />
      <View style={[styles.pixel, { position: 'absolute', left: unit * 4, top: unit * 1, width: unit, height: unit * 6, backgroundColor: colors.healthBarBrown }]} />
      <View style={[styles.pixel, { position: 'absolute', left: unit * 5, top: unit * 2, width: unit, height: unit * 4, backgroundColor: colors.healthBarBrown }]} />
      <View style={[styles.pixel, { position: 'absolute', left: unit * 6, top: unit * 3, width: unit, height: unit * 3, backgroundColor: colors.healthBarBrown }]} />
      <View style={[styles.pixel, { position: 'absolute', left: unit * 7, top: unit * 4, width: unit, height: unit * 2, backgroundColor: colors.healthBarBrown }]} />
    </>
  );

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {type === 'health' && renderHeart()}
      {type === 'water' && renderPotion()}
      {type === 'sunlight' && renderSun()}
      {type === 'soil' && renderSoil()}
      {type === 'bioLink' && renderBioLink()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pixel: {
    borderRadius: 0, // Sharp corners for pixel art
  },
});

