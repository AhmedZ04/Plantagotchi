/**
 * Typography system with retro/pixel vibe
 * Designed for readability on Android devices
 * Uses system fonts for consistency across platforms
 */

import { Platform } from 'react-native';

export const typography = {
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: 0.3,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0.1,
  },
} as const;

export type Typography = typeof typography;
export type TypographyKey = keyof Typography;

/**
 * Font family configuration
 * Uses system fonts for retro/pixel feel without custom font dependencies
 */
export const fontFamily = Platform.select({
  ios: {
    regular: 'System',
    bold: 'System',
    mono: 'Menlo',
  },
  android: {
    regular: 'Roboto',
    bold: 'Roboto',
    mono: 'monospace',
  },
  default: {
    regular: 'system-ui',
    bold: 'system-ui',
    mono: 'monospace',
  },
});

/**
 * Helper function to get typography style
 * @param key - Typography key (title, subtitle, body, etc.)
 * @returns Typography style object
 */
export const getTypography = (key: TypographyKey) => {
  return typography[key];
};

