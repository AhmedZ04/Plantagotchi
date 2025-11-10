/**
 * Spacing system for mobile-optimized layouts
 * Values are tuned for Android and mobile devices
 */

export const spacing = {
  xs: 4, // Extra small spacing (4px)
  sm: 8, // Small spacing (8px)
  md: 12, // Medium spacing (12px)
  lg: 16, // Large spacing (16px)
  xl: 24, // Extra large spacing (24px)
  xxl: 32, // Extra extra large spacing (32px)
} as const;

export type Spacing = typeof spacing;

/**
 * Helper function to get spacing value
 * @param key - Spacing key (xs, sm, md, lg, xl, xxl)
 * @returns Spacing value in pixels
 */
export const getSpacing = (key: keyof Spacing): number => {
  return spacing[key];
};

