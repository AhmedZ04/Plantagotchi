/**
 * HealthBar Component
 * 
 * Pixel-perfect recreation matching the reference design
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, useWindowDimensions, ViewStyle } from 'react-native';

interface HealthBarProps {
  healthPercentage: number; // 0-100
  width?: number;
  style?: ViewStyle;
}

const COLORS = {
  black: '#000000',
  red: '#e74c3c',
  darkRed: '#c0392b',
  white: '#ffffff',
  lightGray: '#f0f0f0',
};

/**
 * Pixel Art Heart Icon - matching reference image
 */
const HeartIcon: React.FC<{ size: number }> = ({ size }) => {
  const p = size / 16; // pixel unit
  
  // Define the heart pixel pattern
  const pixels: Array<{ x: number; y: number; color: string }> = [
    // Row 0 - top bumps outline
    { x: 2, y: 0, color: COLORS.black },
    { x: 3, y: 0, color: COLORS.black },
    { x: 4, y: 0, color: COLORS.black },
    { x: 10, y: 0, color: COLORS.black },
    { x: 11, y: 0, color: COLORS.black },
    { x: 12, y: 0, color: COLORS.black },
    
    // Row 1 - top outline
    { x: 1, y: 1, color: COLORS.black },
    { x: 2, y: 1, color: COLORS.red },
    { x: 3, y: 1, color: COLORS.red },
    { x: 4, y: 1, color: COLORS.red },
    { x: 5, y: 1, color: COLORS.black },
    { x: 9, y: 1, color: COLORS.black },
    { x: 10, y: 1, color: COLORS.red },
    { x: 11, y: 1, color: COLORS.red },
    { x: 12, y: 1, color: COLORS.red },
    { x: 13, y: 1, color: COLORS.black },
    
    // Row 2 - white highlights
    { x: 0, y: 2, color: COLORS.black },
    { x: 1, y: 2, color: COLORS.red },
    { x: 2, y: 2, color: COLORS.white },
    { x: 3, y: 2, color: COLORS.white },
    { x: 4, y: 2, color: COLORS.red },
    { x: 5, y: 2, color: COLORS.red },
    { x: 6, y: 2, color: COLORS.black },
    { x: 8, y: 2, color: COLORS.black },
    { x: 9, y: 2, color: COLORS.red },
    { x: 10, y: 2, color: COLORS.red },
    { x: 11, y: 2, color: COLORS.red },
    { x: 12, y: 2, color: COLORS.red },
    { x: 13, y: 2, color: COLORS.red },
    { x: 14, y: 2, color: COLORS.black },
    
    // Row 3
    { x: 0, y: 3, color: COLORS.black },
    { x: 1, y: 3, color: COLORS.red },
    { x: 2, y: 3, color: COLORS.white },
    { x: 3, y: 3, color: COLORS.red },
    { x: 4, y: 3, color: COLORS.red },
    { x: 5, y: 3, color: COLORS.red },
    { x: 6, y: 3, color: COLORS.red },
    { x: 7, y: 3, color: COLORS.red },
    { x: 8, y: 3, color: COLORS.red },
    { x: 9, y: 3, color: COLORS.red },
    { x: 10, y: 3, color: COLORS.red },
    { x: 11, y: 3, color: COLORS.red },
    { x: 12, y: 3, color: COLORS.red },
    { x: 13, y: 3, color: COLORS.red },
    { x: 14, y: 3, color: COLORS.black },
    
    // Row 4
    { x: 0, y: 4, color: COLORS.black },
    { x: 1, y: 4, color: COLORS.red },
    { x: 2, y: 4, color: COLORS.red },
    { x: 3, y: 4, color: COLORS.red },
    { x: 4, y: 4, color: COLORS.red },
    { x: 5, y: 4, color: COLORS.red },
    { x: 6, y: 4, color: COLORS.red },
    { x: 7, y: 4, color: COLORS.red },
    { x: 8, y: 4, color: COLORS.red },
    { x: 9, y: 4, color: COLORS.red },
    { x: 10, y: 4, color: COLORS.red },
    { x: 11, y: 4, color: COLORS.red },
    { x: 12, y: 4, color: COLORS.red },
    { x: 13, y: 4, color: COLORS.red },
    { x: 14, y: 4, color: COLORS.black },
    
    // Row 5
    { x: 0, y: 5, color: COLORS.black },
    { x: 1, y: 5, color: COLORS.red },
    { x: 2, y: 5, color: COLORS.red },
    { x: 3, y: 5, color: COLORS.red },
    { x: 4, y: 5, color: COLORS.red },
    { x: 5, y: 5, color: COLORS.red },
    { x: 6, y: 5, color: COLORS.red },
    { x: 7, y: 5, color: COLORS.red },
    { x: 8, y: 5, color: COLORS.red },
    { x: 9, y: 5, color: COLORS.red },
    { x: 10, y: 5, color: COLORS.red },
    { x: 11, y: 5, color: COLORS.red },
    { x: 12, y: 5, color: COLORS.red },
    { x: 13, y: 5, color: COLORS.red },
    { x: 14, y: 5, color: COLORS.black },
    
    // Row 6 - start tapering
    { x: 1, y: 6, color: COLORS.black },
    { x: 2, y: 6, color: COLORS.red },
    { x: 3, y: 6, color: COLORS.red },
    { x: 4, y: 6, color: COLORS.red },
    { x: 5, y: 6, color: COLORS.red },
    { x: 6, y: 6, color: COLORS.red },
    { x: 7, y: 6, color: COLORS.red },
    { x: 8, y: 6, color: COLORS.red },
    { x: 9, y: 6, color: COLORS.red },
    { x: 10, y: 6, color: COLORS.red },
    { x: 11, y: 6, color: COLORS.red },
    { x: 12, y: 6, color: COLORS.red },
    { x: 13, y: 6, color: COLORS.black },
    
    // Row 7
    { x: 2, y: 7, color: COLORS.black },
    { x: 3, y: 7, color: COLORS.red },
    { x: 4, y: 7, color: COLORS.red },
    { x: 5, y: 7, color: COLORS.red },
    { x: 6, y: 7, color: COLORS.red },
    { x: 7, y: 7, color: COLORS.red },
    { x: 8, y: 7, color: COLORS.red },
    { x: 9, y: 7, color: COLORS.red },
    { x: 10, y: 7, color: COLORS.red },
    { x: 11, y: 7, color: COLORS.red },
    { x: 12, y: 7, color: COLORS.black },
    
    // Row 8
    { x: 3, y: 8, color: COLORS.black },
    { x: 4, y: 8, color: COLORS.red },
    { x: 5, y: 8, color: COLORS.red },
    { x: 6, y: 8, color: COLORS.red },
    { x: 7, y: 8, color: COLORS.red },
    { x: 8, y: 8, color: COLORS.red },
    { x: 9, y: 8, color: COLORS.red },
    { x: 10, y: 8, color: COLORS.red },
    { x: 11, y: 8, color: COLORS.black },
    
    // Row 9
    { x: 4, y: 9, color: COLORS.black },
    { x: 5, y: 9, color: COLORS.red },
    { x: 6, y: 9, color: COLORS.red },
    { x: 7, y: 9, color: COLORS.red },
    { x: 8, y: 9, color: COLORS.red },
    { x: 9, y: 9, color: COLORS.red },
    { x: 10, y: 9, color: COLORS.black },
    
    // Row 10
    { x: 5, y: 10, color: COLORS.black },
    { x: 6, y: 10, color: COLORS.red },
    { x: 7, y: 10, color: COLORS.red },
    { x: 8, y: 10, color: COLORS.red },
    { x: 9, y: 10, color: COLORS.black },
    
    // Row 11
    { x: 6, y: 11, color: COLORS.black },
    { x: 7, y: 11, color: COLORS.red },
    { x: 8, y: 11, color: COLORS.black },
    
    // Row 12 - bottom point
    { x: 7, y: 12, color: COLORS.black },
  ];
  
  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      {pixels.map((pixel, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            left: pixel.x * p,
            top: pixel.y * p,
            width: p,
            height: p,
            backgroundColor: pixel.color,
          }}
        />
      ))}
    </View>
  );
};

export function HealthBar({
  healthPercentage,
  width,
  style,
}: HealthBarProps) {
  const { width: windowWidth } = useWindowDimensions();
  
  // Clamp health
  const clampedHealth = Math.max(0, Math.min(100, healthPercentage));
  
  // Calculate dimensions
  const containerWidth = width ?? Math.min(500, windowWidth - 32);
  const containerHeight = containerWidth * 0.25; // Aspect ratio from reference
  
  // Heart dimensions
  const heartSize = containerHeight * 1.4;
  const heartLeft = -heartSize * 0.3;
  
  // Bar dimensions
  const barLeft = heartSize * 0.65;
  const barWidth = containerWidth - barLeft - 20;
  const barHeight = containerHeight * 0.5;
  const borderWidth = Math.max(3, containerHeight * 0.08);
  const cornerRadius = barHeight / 2;
  
  // Calculate fill width
  const maxFillWidth = barWidth - borderWidth * 2;
  const targetFillWidth = (clampedHealth / 100) * maxFillWidth;
  
  // Animated fill
  const animatedFillWidth = useRef(new Animated.Value(targetFillWidth)).current;
  const isInitialMount = useRef(true);
  
  // Update animation
  useEffect(() => {
    const newTargetWidth = (clampedHealth / 100) * maxFillWidth;
    
    if (isInitialMount.current) {
      isInitialMount.current = false;
      animatedFillWidth.setValue(newTargetWidth);
      return;
    }
    
    Animated.timing(animatedFillWidth, {
      toValue: newTargetWidth,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [clampedHealth, maxFillWidth, animatedFillWidth]);
  
  return (
    <View style={[styles.container, { width: containerWidth, height: containerHeight }, style]}>
      {/* Heart Icon */}
      <View style={[
        styles.heartWrapper,
        {
          left: heartLeft,
          top: containerHeight / 2 - heartSize / 2,
          width: heartSize,
          height: heartSize,
        }
      ]}>
        <HeartIcon size={heartSize} />
      </View>
      
      {/* Health Bar Container */}
      <View style={[
        styles.barContainer,
        {
          left: barLeft,
          top: containerHeight / 2 - barHeight / 2,
          width: barWidth,
          height: barHeight,
        }
      ]}>
        {/* White background with black border */}
        <View style={[
          styles.barOutline,
          {
            width: barWidth,
            height: barHeight,
            borderRadius: cornerRadius,
            borderWidth: borderWidth,
            borderColor: COLORS.black,
            backgroundColor: COLORS.white,
          }
        ]} />
        
        {/* Red fill bar - fills entire height minus border */}
        <Animated.View
          style={[
            styles.barFill,
            {
              left: borderWidth,
              top: borderWidth,
              width: animatedFillWidth,
              height: barHeight - borderWidth * 2,
              backgroundColor: COLORS.red,
              borderTopLeftRadius: cornerRadius - borderWidth,
              borderBottomLeftRadius: cornerRadius - borderWidth,
              borderTopRightRadius: cornerRadius - borderWidth,
              borderBottomRightRadius: cornerRadius - borderWidth,
            }
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'visible',
  },
  heartWrapper: {
    position: 'absolute',
    zIndex: 5,
  },
  barContainer: {
    position: 'absolute',
    overflow: 'visible',
  },
  barOutline: {
    position: 'absolute',
    borderStyle: 'solid',
  },
  barFill: {
    position: 'absolute',
  },
});