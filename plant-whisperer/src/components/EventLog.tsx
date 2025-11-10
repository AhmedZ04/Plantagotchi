/**
 * EventLog component
 * Displays a log of plant care events
 * Implementation placeholder - actual component from Dev C
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { PlantEvent } from '../types/plant';
import { colors, spacing, typography } from '../theme';

interface EventLogProps {
  events: PlantEvent[];
  maxItems?: number;
}

export function EventLog({ events, maxItems = 10 }: EventLogProps) {
  const displayEvents = events.slice(0, maxItems);

  if (displayEvents.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No events yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {displayEvents.map((event) => (
        <View key={event.id} style={styles.eventItem}>
          <View style={styles.eventIcon}>
            <Text style={styles.eventIconText}>
              {event.type === 'watered' ? '💧' : event.type === 'checked' ? '✅' : '📋'}
            </Text>
          </View>
          <View style={styles.eventContent}>
            <Text style={styles.eventMessage}>{event.message}</Text>
            <Text style={styles.eventTime}>
              {event.timestamp.toLocaleTimeString()}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 0, // Sharp corners for pixel art
    borderWidth: 2, // Thicker border
    borderColor: colors.pixelBorderDark,
    // Pixel art 3D effect
    borderTopColor: colors.pixelHighlight,
    borderLeftColor: colors.pixelHighlight,
    borderBottomColor: colors.pixelBorderDark,
    borderRightColor: colors.pixelBorderDark,
  },
  eventIcon: {
    width: spacing.xl,
    height: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  eventIconText: {
    fontSize: spacing.lg,
  },
  eventContent: {
    flex: 1,
  },
  eventMessage: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontFamily: 'monospace', // Pixel art font
  },
  eventTime: {
    ...typography.caption,
    color: colors.textTertiary,
    fontFamily: 'monospace', // Pixel art font
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

