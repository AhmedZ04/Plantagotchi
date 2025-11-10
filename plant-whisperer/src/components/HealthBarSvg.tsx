/**
 * HealthBarSvg component - Renders the health bar SVG with dynamic fill
 * Uses react-native-svg to control the fill percentage dynamically
 */

import React, { useEffect, useRef, useState } from 'react';
import Svg, {
  Defs,
  ClipPath,
  Path,
  G,
} from 'react-native-svg';

interface HealthBarSvgProps {
  healthPercentage: number; // 0-100
  width?: number;
  height?: number;
}

export function HealthBarSvg({
  healthPercentage,
  width = 814,
  height = 223,
}: HealthBarSvgProps) {
  // Inner meter dimensions - EXACT coordinates from the SVG path analysis
  // Path: m728.8 60c27.6 0 49.9 22.3 49.9 49.9 0 27.6-22.3 50-49.9 50h-617.8c0 0 0-22.4 0-50 0-27.6 22.4-49.9 50-49.9z
  // Analysis:
  // - Path starts at (728.8, 60) - top right before corner
  // - Right corner curve ends at ~(728.8, 110) vertically, extends to ~(778.7, 60) horizontally
  // - Horizontal line: h-617.8 from (728.8, 160) to (111, 160) - bottom edge
  // - Left corner: curves from (111, 160) up to (161, 60)
  // - Inner rectangle: x from 161 to 728.8, y from 60 to 110
  // - But the path actually goes: x from 111 (left corner start) to 778.7 (right corner end)
  // Inner meter dimensions - exact coordinates from SVG analysis
  // The inner meter path creates a rounded rectangle from x=111 to x=728.8
  // Height: y=60 to y=110 (50 units tall)
  const innerMeterLeftEdge = 111; // Left edge of inner meter
  const innerMeterRightEdge = 728.8; // Right edge of inner meter  
  const innerMeterTopY = 60; // Top of inner meter
  const innerMeterBottomY = 110; // Bottom of inner meter (60 + 50)
  const maxFillWidthFromLeft = innerMeterRightEdge - innerMeterLeftEdge; // 617.8 - full width
  
  // Clamp health percentage to 0-100
  const clampedHealth = Math.max(0, Math.min(100, healthPercentage));
  
  // Calculate target fill width from health percentage
  // Fill from the left edge (111) to the calculated position
  const targetFillWidth = (clampedHealth / 100) * maxFillWidthFromLeft;
  
  // State for animated fill width
  const [fillWidth, setFillWidth] = useState(targetFillWidth);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startWidthRef = useRef<number>(targetFillWidth);
  const currentWidthRef = useRef<number>(targetFillWidth);
  const isInitialMountRef = useRef<boolean>(true);

  // Update fill width when health percentage changes
  useEffect(() => {
    const newTargetWidth = (clampedHealth / 100) * maxFillWidthFromLeft;
    
    // On initial mount, set directly without animation
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      setFillWidth(newTargetWidth);
      currentWidthRef.current = newTargetWidth;
      startWidthRef.current = newTargetWidth;
      return;
    }
    
    // Cancel any existing animation
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Start animation from current width to new target
    startWidthRef.current = currentWidthRef.current;
    startTimeRef.current = Date.now();
    const duration = 800; // 800ms animation
    
    const animate = () => {
      const now = Date.now();
      const elapsed = startTimeRef.current ? now - startTimeRef.current : 0;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic for smooth animation
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentWidth = startWidthRef.current + (newTargetWidth - startWidthRef.current) * easedProgress;
      
      currentWidthRef.current = currentWidth;
      setFillWidth(currentWidth);
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure we end at exact target
        currentWidthRef.current = newTargetWidth;
        setFillWidth(newTargetWidth);
        animationFrameRef.current = null;
      }
    };
    
    animate();
    
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [clampedHealth, maxFillWidthFromLeft]);

  return (
    <Svg
      viewBox="0 0 814 223"
      width={width}
      height={height}
      preserveAspectRatio="xMidYMid meet"
    >
      <Defs>
        {/* Clip path for the main bar area */}
        <ClipPath id="cp1">
          <Path d="m99 49h690.39v122.67h-690.39z" />
        </ClipPath>
        
        {/* Clip path for the heart area */}
        <ClipPath id="cp2">
          <Path d="m21.39 26.45h192.28v161h-192.28z" />
        </ClipPath>
        
        {/* Dynamic clip path to limit fill width */}
        <ClipPath id="healthFillClip">
          <Path d={`M ${innerMeterLeftEdge} ${innerMeterTopY - 5} L ${innerMeterLeftEdge + fillWidth} ${innerMeterTopY - 5} L ${innerMeterLeftEdge + fillWidth} ${innerMeterBottomY + 5} L ${innerMeterLeftEdge} ${innerMeterBottomY + 5} Z`} />
        </ClipPath>
      </Defs>

      {/* Main bar area with clip path */}
      <G clipPath="url(#cp1)">
        {/* Black meter outline */}
        <Path
          d="m728.8 49.3h-567.8c-33.5 0-60.7 27.2-60.7 60.6v60.7h628.5c33.4 0 60.7-27.2 60.7-60.7 0-33.4-27.3-60.6-60.7-60.6zm0 10.7c27.6 0 49.9 22.3 49.9 49.9 0 27.6-22.3 50-49.9 50h-617.8c0 0 0-22.4 0-50 0-27.6 22.4-49.9 50-49.9z"
          fill="#231f20"
        />
        
        {/* Red health fill - use the EXACT inner meter path, clipped to fill width */}
        <G clipPath="url(#healthFillClip)">
          <Path
            d="m728.8 60c27.6 0 49.9 22.3 49.9 49.9 0 27.6-22.3 50-49.9 50h-617.8c0 0 0-22.4 0-50 0-27.6 22.4-49.9 50-49.9z"
            fill="#d83b2f"
          />
        </G>
      </G>

      {/* Heart icon */}
      <Path
        d="m107.8 183.9v-11.3h-11.8v-11.2h-11.9v-11.3h-11.8v-11.3h-11.8v-11.2h-11.9v-11.3h-11.8v-22.5h-11.8v-29.7h11.8v-22.6h11.8v-11.2h42.7v11.2h11.8v11.3h11.8v11.3h4.7v-11.3h11.9v-11.3h11.8v-11.2h42.7v11.2h11.8v22.6h11.8v29.7h-11.8v22.5h-11.8v11.3h-11.9v11.2h-11.8v11.3h-11.8v11.3h-11.9v11.2h-11.8v11.3z"
        fill="#d83b2f"
      />

      {/* Heart outline with clip path */}
      <G clipPath="url(#cp2)">
        <Path
          d="m189.5 26.7h-49.8v11.3h-11.8v11.2h-21.3v-11.2h-11.8v-11.3h-49.7v11.3h-11.9v22.5h-11.8v36.8h11.8v22.6h11.9v11.3h11.8v11.2h11.9v11.3h11.8v11.3h11.9v11.2h11.8v11.3h26.1v-11.3h11.9v-11.2h11.8v-11.3h11.9v-11.3h11.8v-11.2h11.9v-11.3h11.8v-22.6h11.9v-36.8h-11.9v-22.5h-11.8v-11.3zm-7.1 7.1v11.3h11.8v22.6h11.8v22.5h-11.8v22.5h-11.8v11.3h-11.9v11.3h-11.8v11.3h-11.8v11.2h-11.9v11.3h-11.8v11.3h-11.8v-11.3h-11.9v-11.3h-11.8v-11.2h-11.9v-11.3h-11.8v-11.3h-11.8v-11.3h-11.9v-22.5h-11.8v-22.5h11.8v-22.6h11.9v-11.3h35.5v11.3h11.8v11.3h11.8v11.3h11.8v-11.3h11.9v-11.3h11.8v-11.3z"
          fill="#231f20"
        />
      </G>

      {/* Heart highlight */}
      <Path
        d="m51.4 67.7h-11.8v11.3h23.7v-22.7h-11.9z"
        fill="#fff"
      />
      <Path
        d="m63.3 45h11.9v11.3h-11.9z"
        fill="#fff"
      />
      <Path
        d="m51.8 67.7h-11.8v11.3h23.7v-22.7h-11.9z"
        fill="#fff"
      />
      <Path
        d="m63.7 45h11.9v11.3h-11.9z"
        fill="#fff"
      />
    </Svg>
  );
}
