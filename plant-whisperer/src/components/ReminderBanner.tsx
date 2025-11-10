/**
 * ReminderBanner component
 * Displays reminders for plant care tasks
 * Implementation placeholder - actual component from Dev C
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Reminder } from '../types/plant';
import { colors, spacing, typography } from '../theme';

interface ReminderBannerProps {
  reminders: Reminder[];
}

export function ReminderBanner({ reminders }: ReminderBannerProps) {
  if (!reminders || reminders.length === 0) {
    return null;
  }

  const urgentReminder = reminders.find((r) => r.isUrgent);
  const displayReminder = urgentReminder || reminders[0];

  return (
    <View
      style={[
        styles.container,
        displayReminder.isUrgent && styles.urgentContainer,
      ]}>
      <Text style={styles.text}>{displayReminder.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.warning,
    padding: spacing.md,
    borderRadius: 0, // Sharp corners for pixel art
    borderWidth: 3, // Thicker border
    borderColor: colors.pixelBorderDark,
    // Pixel art 3D effect
    borderTopColor: colors.pixelHighlight,
    borderLeftColor: colors.pixelHighlight,
    borderBottomColor: colors.pixelBorderDark,
    borderRightColor: colors.pixelBorderDark,
  },
  urgentContainer: {
    backgroundColor: colors.danger,
    borderColor: colors.dangerDark,
  },
  text: {
    ...typography.body,
    color: colors.textInverse,
    textAlign: 'center',
    fontFamily: 'monospace', // Pixel art font
  },
});

