import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { usePlantState } from '@/src/hooks/usePlantState';
import { HealthBars } from '@/src/components/HealthBars';
import { PixelCameraIcon } from '@/src/components/PixelCameraIcon';
import { spacing, colors, typography } from '@/src/theme';
import {
  isSoilOptimal,
  isTempOptimal,
  isHumOptimal,
  isMq2Optimal,
} from '@/src/services/plantModel';

/**
 * DashboardScreen - Shows background image with blurred section below black line
 * Health bars are displayed on top of the blurred area
 */
export default function DashboardScreen() {
  const { scores, rawVitals } = usePlantState();
  const { height: windowHeight } = useWindowDimensions();
  const router = useRouter();

  // Sensor status helpers for animation selection
  const { soilMoisture, temperature, humidity, mq2 } = rawVitals;

  const allSensorsOptimal = useMemo(() => {
    return (
      isSoilOptimal(soilMoisture) &&
      isTempOptimal(temperature) &&
      isHumOptimal(humidity) &&
      isMq2Optimal(mq2)
    );
  }, [soilMoisture, temperature, humidity, mq2]);

  const animationSource = useMemo(() => {
    if (temperature < 13) {
      return require('../../assets/images/cold_animation_night.gif');
    }
    if (allSensorsOptimal) {
      return require('../../assets/images/peak_animation_night.gif');
    }
    return null;
  }, [temperature, allSensorsOptimal]);

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
        {/* Camera Icon Button - Top Right */}
        <TouchableOpacity
          style={styles.cameraButton}
          onPress={() => router.push('/camera')}
          activeOpacity={0.7}
        >
          <PixelCameraIcon size={32} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Background Image */}
        <Image
          source={require('../../assets/images/bg_only.png')}
          style={styles.backgroundImage}
          contentFit="cover"
        />
        {/* Plant animation overlay (condition-based GIF) */}
        {animationSource && (
          <Image
            source={animationSource}
            style={[styles.layerImage, { zIndex: 2 }]}
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
              <HealthBars scores={scores} rawVitals={rawVitals} />
            </View>
          )}
        </View>
      </View>
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
  cameraButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 20, // Above all other elements
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5, // Android shadow
  },
});
