import React from 'react';
import { View, StyleSheet, useWindowDimensions, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePlantState } from '@/src/hooks/usePlantState';
import { HealthBars } from '@/src/components/HealthBars';
import { spacing, colors } from '@/src/theme';
import { useRouter } from 'expo-router';
import { PixelCameraIcon } from '@/src/components/PixelCameraIcon';

/**
 * DashboardScreen - Shows background image with blurred section below black line
 * Health bars are displayed on top of the blurred area
 */
export default function DashboardScreen() {
  const router = useRouter();
  const { scores, emotion } = usePlantState();
  const { height: windowHeight } = useWindowDimensions();

  // Check if emotion is I_AM_OKAY
  const isOkayState = emotion === 'I_AM_OKAY';

  // Position of the black line (as percentage of screen height)
  // Adjust this value based on your background image
  const BLACK_LINE_POSITION = 0.65; // 65% down the screen
  const BLACK_LINE_HEIGHT = 4;
  const blackLineTop = windowHeight * BLACK_LINE_POSITION;
  const blurredSectionTop = blackLineTop + BLACK_LINE_HEIGHT;
  const blurredSectionHeight = windowHeight - blurredSectionTop;

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <View style={styles.container}>
        {/* Background Image - Conditional based on emotion state */}
        {isOkayState ? (
          <>
            {/* Layer 1: Bottom background - only bg only.png */}
            <Image
              source={require('../../assets/images/only_bg_only.png')}
              style={[styles.layerImage, { zIndex: 1 }]}
              contentFit="cover"
            />
            {/* Layer 2: Window.png */}
            <Image
              source={require('../../assets/images/Window.png')}
              style={[styles.layerImage, { zIndex: 2 }]}
              contentFit="cover"
            />
            {/* Layer 3: Shelf.png */}
            <Image
              source={require('../../assets/images/shelf.png')}
              style={[styles.layerImage, { zIndex: 3 }]}
              contentFit="cover"
            />
            {/* Layer 4: Pot animated GIF - pot_ok.gif */}
            <Image
              source={require('../../assets/images/pot_ok.gif')}
              style={[styles.layerImage, { zIndex: 4 }]}
              contentFit="cover"
            />
          </>
        ) : (
          /* When NOT I_AM_OKAY: Show Background.png */
          <Image
            source={require('../../assets/images/Background.png')}
            style={styles.backgroundImage}
            contentFit="cover"
          />
        )}

        {/* Black Line Separator */}
        <View
          style={[
            styles.blackLine,
            {
              top: blackLineTop,
            },
          ]}
        />

        {/* Blurred Section Below Black Line - Using multiple layers for better blur effect */}
        <View
          style={[
            styles.blurredSection,
            {
              top: blurredSectionTop,
              height: blurredSectionHeight,
            },
          ]}>
          {/* Background blur layer - High intensity, no tint for true Gaussian blur */}
          <BlurView
            intensity={120}
            tint="default"
            style={styles.blurLayer}
          />
          {/* Health Bars on top of blurred area */}
          {scores && (
            <View style={styles.healthBarsContainer}>
              <HealthBars scores={scores} />
            </View>
          )}
        </View>
      </View>

      {/* Floating Camera Button (navigate to /camera) */}
      <TouchableOpacity
        onPress={() => router.push('/camera')}
        style={styles.cameraFab}
        activeOpacity={0.85}
      >
        <PixelCameraIcon size={22} color={colors.textOnPrimary} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  layerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blackLine: {
    position: 'absolute',
    width: '100%',
    height: 4,
    backgroundColor: '#000000',
    zIndex: 5, // Above all image layers, below health bars
  },
  blurredSection: {
    position: 'absolute',
    width: '100%',
    left: 0,
    right: 0,
    zIndex: 6, // Above all image layers and black line, contains health bars
    overflow: 'hidden',
  },
  blurLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  healthBarsContainer: {
    position: 'relative',
    zIndex: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    justifyContent: 'flex-start',
  },
  cameraFab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: colors.primaryDark,
    borderColor: colors.pixelOutline,
    borderWidth: 2,
    borderRadius: 28,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 6,
  },
});
