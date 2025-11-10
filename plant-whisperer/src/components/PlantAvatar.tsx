/**
 * PlantAvatar component
 * Displays the plant's avatar/visual representation
 * Currently supports looping videos with programmatic scaling
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { PlantMood, EmotionState } from '../types/plant';
import { colors, spacing, typography } from '../theme';

interface PlantAvatarProps {
  mood: PlantMood;
  emotion: EmotionState;
  size?: number;
  /** Scale multiplier for the visual asset (default: 1.0) */
  scale?: number;
}

// Map emotion states to asset paths (videos only; GIF support removed)
const getEmotionAsset = (emotion: EmotionState): { type: 'video'; source: any } | null => {
  switch (emotion) {
    case 'I_NEED_WATER':
      return {
        type: 'video',
        source: require('../../assets/videos/I_NEED_WATER.mp4'),
      };
    // Add more mappings as you add additional videos:
    // case 'I_FEEL_GREAT':
    //   return { type: 'video', source: require('../../assets/videos/I_FEEL_GREAT.mp4') };
    default:
      return null; // Fall back to text
  }
};

export function PlantAvatar({ mood, emotion, size = 120, scale = 1.0 }: PlantAvatarProps) {
  const asset = getEmotionAsset(emotion);
  const imageSize = size * scale; // Scale the visual asset by the multiplier
  const videoRef = React.useRef<Video>(null);

  // Restart video when emotion changes
  useEffect(() => {
    if (asset?.type === 'video' && videoRef.current) {
      videoRef.current.replayAsync();
    }
  }, [emotion, asset]);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          minHeight: size,
          backgroundColor: colors.primaryLight,
          borderRadius: 0, // Sharp corners for pixel art
        },
      ]}>
      {/* Display video if available (using expo-av) */}
      {asset && asset.type === 'video' && (
        <Video
          ref={videoRef}
          source={asset.source}
          style={[
            styles.video,
            {
              width: imageSize,
              height: imageSize,
              maxWidth: size * 0.9,
              maxHeight: size * 0.9,
            },
          ]}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          isLooping
          isMuted
        />
      )}

      {/* Fallback to text if no asset found */}
      {!asset && (
        <View style={styles.emotionContainer}>
          <Text style={styles.emotionText} numberOfLines={3} adjustsFontSizeToFit>
            {emotion}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3, // Thicker border for pixel art
    borderColor: colors.pixelBorderDark,
    position: 'relative',
    padding: spacing.md,
    overflow: 'hidden', // Clip media to container bounds
    // Pixel art 3D effect
    borderTopColor: colors.pixelHighlight,
    borderLeftColor: colors.pixelHighlight,
    borderBottomColor: colors.pixelBorderDark,
    borderRightColor: colors.pixelBorderDark,
  },
  video: {
    // Video styling
    borderRadius: 0, // Sharp corners for pixel art
  },
  emotionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emotionText: {
    ...typography.body,
    fontFamily: 'monospace',
    color: colors.textPrimary,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
  },
});

