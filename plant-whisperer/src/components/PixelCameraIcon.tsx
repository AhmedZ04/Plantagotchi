/**
 * Pixel art style camera icon component
 * Created using View components for a true pixel art look
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

interface PixelCameraIconProps {
  size?: number;
  color?: string;
}

export function PixelCameraIcon({ size = 24, color = colors.textInverse }: PixelCameraIconProps) {
  // Create pixel art camera icon using simple blocky shapes
  const unit = size / 6; // 6x6 grid for simplicity
  
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Camera body - main rectangle */}
      <View
        style={[
          styles.body,
          {
            position: 'absolute',
            left: unit,
            top: unit * 1.5,
            width: unit * 4,
            height: unit * 3,
            backgroundColor: color,
            borderWidth: 2,
            borderColor: color === colors.textInverse ? colors.background : colors.pixelOutline,
          },
        ]}
      />
      
      {/* Lens - centered square (pixel art style) */}
      <View
        style={[
          styles.lens,
          {
            position: 'absolute',
            left: unit * 2,
            top: unit * 2,
            width: unit * 2,
            height: unit * 2,
            backgroundColor: color === colors.textInverse ? colors.background : colors.surface,
            borderWidth: 2,
            borderColor: color,
          },
        ]}
      />
      
      {/* Lens center dot */}
      <View
        style={[
          styles.lensDot,
          {
            position: 'absolute',
            left: unit * 2.5,
            top: unit * 2.5,
            width: unit,
            height: unit,
            backgroundColor: color,
          },
        ]}
      />
      
      {/* Viewfinder - top rectangle */}
      <View
        style={[
          styles.viewfinder,
          {
            position: 'absolute',
            left: unit * 2,
            top: 0,
            width: unit * 2,
            height: unit * 1.5,
            backgroundColor: color,
            borderWidth: 2,
            borderColor: color === colors.textInverse ? colors.background : colors.pixelOutline,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    borderRadius: 0, // Sharp corners for pixel art
  },
  lens: {
    borderRadius: 0, // Sharp corners for pixel art
  },
  lensDot: {
    borderRadius: 0, // Sharp corners for pixel art
  },
  viewfinder: {
    borderRadius: 0, // Sharp corners for pixel art
  },
});

