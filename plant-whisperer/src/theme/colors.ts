/**
 * Pixel/Retro-style color palette for plant care game
 * Colors inspired by cheerful pixel art games - light, warm, and vibrant
 * Designed to be cohesive, readable on Android, and evoke a retro gaming vibe
 */

export const colors = {
  // Background colors (light, warm tones like the pixel art examples)
  background: '#f5e6d3', // Warm cream/beige background (like indoor scenes)
  backgroundAlt: '#e8d4b8', // Alternative warm background
  surface: '#ffffff', // White surface for cards/containers
  surfaceElevated: '#f9f5f0', // Slightly off-white for elevated surfaces
  surfaceWarm: '#fff8f0', // Warm white for indoor scenes

  // Primary colors (vibrant green tones for plants)
  primary: '#66bb6a', // Bright green for plants
  primaryDark: '#4caf50', // Darker green for pressed states
  primaryLight: '#81c784', // Lighter green for highlights
  primaryVibrant: '#8bc34a', // Vibrant light green

  // Secondary colors (earth/plant tones)
  secondary: '#a5d6a7', // Soft light green
  secondaryDark: '#81c784', // Darker secondary
  secondaryLight: '#c8e6c9', // Very light green

  // Accent colors (warm, cheerful)
  accent: '#ffa726', // Warm orange accent
  accentDark: '#ff9800', // Darker orange
  accentLight: '#ffb74d', // Lighter orange

  // Status colors
  danger: '#ef5350', // Soft red for errors/warnings
  dangerDark: '#e53935', // Darker red
  warning: '#ffb74d', // Warm yellow for warnings
  warningDark: '#ffa726', // Darker yellow
  success: '#66bb6a', // Green for success
  successDark: '#4caf50', // Darker green

  // Neutral colors (warm grays)
  neutral: '#bdbdbd', // Medium gray
  neutralDark: '#757575', // Darker gray
  neutralLight: '#e0e0e0', // Light gray

  // Text colors (dark on light backgrounds)
  textPrimary: '#3e2723', // Dark brown for primary text (readable on light)
  textSecondary: '#6d4c41', // Medium brown for secondary text
  textTertiary: '#8d6e63', // Lighter brown for tertiary text
  textInverse: '#ffffff', // White text for dark backgrounds
  textOnPrimary: '#ffffff', // White text on primary colored backgrounds

  // Pixel/retro specific (clear borders for pixel art feel)
  pixelBorder: '#4caf50', // Green border for pixel-style elements
  pixelBorderDark: '#388e3c', // Darker border for depth
  pixelBorderLight: '#81c784', // Lighter border
  pixelShadow: 'rgba(0, 0, 0, 0.2)', // Soft shadow for depth
  pixelHighlight: '#c8e6c9', // Light highlight for 3D effect
  pixelOutline: '#2e7d32', // Dark outline for pixel art elements

  // Game-specific colors (vibrant but pixel-art appropriate)
  soil: '#8d6e63', // Warm brown for soil
  soilDark: '#6d4c41', // Darker soil
  water: '#42a5f5', // Bright blue for water
  waterDark: '#1e88e5', // Darker blue
  sun: '#ffb74d', // Warm yellow for sun
  sunDark: '#ffa726', // Darker yellow
  health: '#66bb6a', // Green for health
  energy: '#ffa726', // Orange for energy
  coin: '#ffd54f', // Gold for coins/currency
  gem: '#ef5350', // Red for gems/premium currency

  // UI element colors (matching pixel art game aesthetic)
  uiBlue: '#81d4fa', // Light blue for UI elements (like buttons)
  uiBlueDark: '#4fc3f7', // Darker blue
  uiGreen: '#a5d6a7', // Light green for active states
  uiGreenDark: '#81c784', // Darker green

  // Furniture/indoor colors (for game scenes)
  wall: '#fff9c4', // Light yellow wall color
  wallWarm: '#ffe082', // Warmer yellow
  wood: '#d7ccc8', // Light wood color
  woodDark: '#bcaaa4', // Darker wood

  // Transparent overlays
  overlay: 'rgba(0, 0, 0, 0.4)', // Semi-transparent overlay
  overlayLight: 'rgba(0, 0, 0, 0.2)', // Lighter overlay
  overlayWarm: 'rgba(255, 248, 220, 0.8)', // Warm overlay

  // Health bar specific colors (matching pixel art game style)
  healthBarOuterBorder: '#3e2723', // Dark brown/black for outer border
  healthBarInnerFrame: '#ffd54f', // Bright gold/yellow for inner frame
  healthBarIconBg: '#d7ccc8', // Light brown/tan for icon background
  healthBarRed: '#d32f2f', // Deep red for health fill
  healthBarRedLight: '#e53935', // Lighter red for gradient top
  healthBarRedDark: '#b71c1c', // Darker red for empty area
  healthBarBlue: '#1976d2', // Medium blue for water fill
  healthBarBlueLight: '#2196f3', // Lighter blue for gradient top
  healthBarBlueDark: '#0d47a1', // Darker blue for empty area
  healthBarGreen: '#388e3c', // Green for health/sunlight
  healthBarGreenLight: '#4caf50', // Lighter green for gradient
  healthBarGreenDark: '#1b5e20', // Darker green for empty
  healthBarBrown: '#6d4c41', // Brown for soil
  healthBarBrownLight: '#8d6e63', // Lighter brown for gradient
  healthBarBrownDark: '#3e2723', // Darker brown for empty
} as const;

export type Colors = typeof colors;

