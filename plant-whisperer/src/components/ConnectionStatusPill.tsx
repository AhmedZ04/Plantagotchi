/**
 * ConnectionStatusPill component
 * Displays the connection status of the plant sensor
 * Implementation placeholder - actual component from Dev C
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ConnectionStatus } from '../services/dataClient';
import { colors, spacing, typography } from '../theme';

interface ConnectionStatusPillProps {
  status: ConnectionStatus;
}

export function ConnectionStatusPill({ status }: ConnectionStatusPillProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return colors.success;
      case 'connecting':
        return colors.warning;
      case 'idle':
        return colors.neutral;
      case 'error':
        return colors.danger;
      default:
        return colors.neutral;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'idle':
        return 'Disconnected';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: getStatusColor() }]}>
      <Text style={styles.text}>{getStatusText()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 0, // Sharp corners for pixel art
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderColor: colors.pixelOutline,
    // Pixel art 3D effect
    borderTopColor: colors.pixelHighlight,
    borderLeftColor: colors.pixelHighlight,
    borderBottomColor: colors.pixelBorderDark,
    borderRightColor: colors.pixelBorderDark,
  },
  text: {
    ...typography.label,
    color: colors.textOnPrimary,
    fontFamily: 'monospace', // Pixel art font
  },
});

