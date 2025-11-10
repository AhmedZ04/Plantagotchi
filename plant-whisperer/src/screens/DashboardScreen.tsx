import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, useWindowDimensions, Text, TouchableOpacity, Animated, ImageSourcePropType, Modal, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
// Lazy require to avoid type resolution issues during linting if package isn't installed yet
// eslint-disable-next-line @typescript-eslint/no-var-requires
const MaskedView = require('@react-native-masked-view/masked-view').default;
// Lazy import to avoid type issues before dependency is installed
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
import { usePlantState } from '@/src/hooks/usePlantState';
import { HealthBars } from '@/src/components/HealthBars';
import { spacing, colors, typography } from '@/src/theme';
import {
  isSoilOptimal,
  isTempOptimal,
  isHumOptimal,
  isMq2Optimal,
  computeBioSignalState,
} from '@/src/services/plantModel';

const COLD_ANIMATION = require('../../assets/images/cold.gif');
const PEAK_ANIMATION = require('../../assets/images/peak.gif');
const AIR_BAD_ANIMATION = require('../../assets/images/air_bad.gif');
const DIZZY_ANIMATION = require('../../assets/images/dizzy.gif');
const DRY_ANIMATION = require('../../assets/images/dry.gif');
const FULL_DEAD_ANIMATION = require('../../assets/images/full_dead.gif');
const HOT_ANIMATION = require('../../assets/images/hot.gif');
const THIRSTY_ANIMATION = require('../../assets/images/thirsty.gif');
const WATERING_ANIMATION = require('../../assets/images/watering.gif');
const WINDY_ANIMATION = require('../../assets/images/windy.gif');

/**
 * DashboardScreen - Shows background image with blurred section below black line
 * Health bars are displayed on top of the blurred area
 */
export default function DashboardScreen() {
  const { scores, rawVitals } = usePlantState();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();

  // Sensor status helpers for animation selection
  const { soilMoisture, temperature, humidity, mq2, bio } = rawVitals;
  // Watering overlay control (limited runs + cooldown)
  const [overrideAnimation, setOverrideAnimation] = useState<ImageSourcePropType | null>(null);
  const [sensorDialogVisible, setSensorDialogVisible] = useState(false);
  const wateringPlaysRef = useRef<number>(0);
  const wateringCooldownUntilRef = useRef<number>(0);
  const prevWateringActiveRef = useRef<boolean>(false);
  const WATERING_PLAYS_KEY = 'watering_plays_count';
  const WATERING_COOLDOWN_KEY = 'watering_cooldown_until';
  const WATERING_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

  const allSensorsOptimal = useMemo(() => {
    return (
      isSoilOptimal(soilMoisture) &&
      isTempOptimal(temperature) &&
      isHumOptimal(humidity) &&
      isMq2Optimal(mq2)
    );
  }, [soilMoisture, temperature, humidity, mq2]);

  const allSensorsNonOptimal = useMemo(() => {
    return (
      !isSoilOptimal(soilMoisture) &&
      !isTempOptimal(temperature) &&
      !isHumOptimal(humidity) &&
      !isMq2Optimal(mq2)
    );
  }, [soilMoisture, temperature, humidity, mq2]);

  // Load watering counters on mount
  useEffect(() => {
    (async () => {
      try {
        // Reset counters each app launch to simplify demo behavior
        wateringPlaysRef.current = 0;
        wateringCooldownUntilRef.current = 0;
        await AsyncStorage.multiRemove([WATERING_PLAYS_KEY, WATERING_COOLDOWN_KEY]);
      } catch {
        // ignore storage errors
      }
    })();
  }, []);

  // Detect watering edge and show limited animation with cooldown
  useEffect(() => {
    const isWateringActive = rawVitals.raindrop < 300;
    const prevActive = prevWateringActiveRef.current;
    prevWateringActiveRef.current = isWateringActive;

    const now = Date.now();
    const inCooldown = now < wateringCooldownUntilRef.current;
    if (isWateringActive && !prevActive && !inCooldown) {
      if (wateringPlaysRef.current < 2) {
        setOverrideAnimation(WATERING_ANIMATION);
        wateringPlaysRef.current += 1;
        AsyncStorage.setItem(WATERING_PLAYS_KEY, String(wateringPlaysRef.current)).catch(() => {});
        // Auto dismiss after 5s so normal state animations resume
        setTimeout(() => setOverrideAnimation(null), 5000);
        if (wateringPlaysRef.current >= 2) {
          const until = now + WATERING_COOLDOWN_MS;
          wateringCooldownUntilRef.current = until;
          AsyncStorage.setItem(WATERING_COOLDOWN_KEY, String(until)).catch(() => {});
        }
      }
    }

    // Reset plays when cooldown expires
    if (!inCooldown && wateringPlaysRef.current >= 2) {
      wateringPlaysRef.current = 0;
      AsyncStorage.setItem(WATERING_PLAYS_KEY, '0').catch(() => {});
    }
  }, [rawVitals.raindrop]);
  const animationSource = useMemo(() => {
    const priorityList: Array<[boolean, ImageSourcePropType]> = [
      [overrideAnimation != null, overrideAnimation as ImageSourcePropType],
      [allSensorsNonOptimal, FULL_DEAD_ANIMATION],
      [mq2 >= 350, DIZZY_ANIMATION],
      [mq2 >= 200, AIR_BAD_ANIMATION],
      [temperature > 27 || humidity > 80, HOT_ANIMATION],
      [humidity < 35, DRY_ANIMATION],
      [soilMoisture >= 900, DRY_ANIMATION],
      [soilMoisture >= 700 && soilMoisture <= 899, THIRSTY_ANIMATION],
      [temperature < 13, COLD_ANIMATION],
      [allSensorsOptimal, PEAK_ANIMATION],
      [computeBioSignalState(bio) === 'wind_trigger', WINDY_ANIMATION],
    ];

    for (const [condition, animation] of priorityList) {
      if (condition) {
        return animation;
      }
    }

    return null;
  }, [overrideAnimation, allSensorsNonOptimal, mq2, temperature, humidity, soilMoisture, allSensorsOptimal, bio]);

  const [currentAnimation, setCurrentAnimation] = useState<ImageSourcePropType | null>(animationSource);
  const [incomingAnimation, setIncomingAnimation] = useState<ImageSourcePropType | null>(null);
  const [incomingReady, setIncomingReady] = useState(false);
  const currentOpacity = useRef(new Animated.Value(animationSource ? 1 : 0)).current;
  const incomingOpacity = useRef(new Animated.Value(0)).current;
  const isTransitioningRef = useRef(false);
  const revealScale = useRef(new Animated.Value(0)).current;
  // Background crossfade state (sunny <-> snowy)
  const [isSnowy, setIsSnowy] = useState(false);
  const bgFade = useRef(new Animated.Value(0)).current; // 0 = sunny, 1 = snowy
  // Speech bubble state
  const [speechVisible, setSpeechVisible] = useState(false);
  const [speechMessage, setSpeechMessage] = useState('');
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpeechAnimationRef = useRef<ImageSourcePropType | null>(null);

  useEffect(() => {
    if (animationSource === currentAnimation) {
      return;
    }

    // If no specific animation is requested, keep showing the current one
    // (avoids empty state when we don't have a dedicated animation)
    if (!animationSource) return;

    if (!currentAnimation) {
      setCurrentAnimation(animationSource);
      currentOpacity.setValue(0);
      Animated.timing(currentOpacity, {
        toValue: 1,
        duration: 360,
        useNativeDriver: true,
      }).start();
      return;
    }

    setIncomingAnimation(animationSource);
    setIncomingReady(false);
    incomingOpacity.setValue(0);
    isTransitioningRef.current = false;
  }, [animationSource, currentAnimation, currentOpacity, incomingOpacity]);

  useEffect(() => {
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }

    if (!currentAnimation) {
      setSpeechVisible(false);
      lastSpeechAnimationRef.current = null;
      return;
    }

    const message = (() => {
      if (currentAnimation === PEAK_ANIMATION) {
        return 'I feel so good :)';
      }
      if (currentAnimation === HOT_ANIMATION) {
        return "Whew, it's way too toasty!";
      }
      if (currentAnimation === COLD_ANIMATION) {
        return "Brrr... I'm freezing out!";
      }
      if (currentAnimation === DRY_ANIMATION) {
        if (humidity < 35) {
          return 'The air feels crackly dry.';
        }
        if (soilMoisture >= 900) {
          return 'My soil is parched... water?';
        }
        return "I'm drying out pretty fast.";
      }
      if (currentAnimation === THIRSTY_ANIMATION) {
        return 'A small drink would help so much.';
      }
      if (currentAnimation === AIR_BAD_ANIMATION) {
        return 'The air smells kinda funky.';
      }
      if (currentAnimation === DIZZY_ANIMATION) {
        return 'These fumes... I feel dizzy!';
      }
      if (currentAnimation === FULL_DEAD_ANIMATION) {
        return 'Everything hurts... send help.';
      }
      if (currentAnimation === WINDY_ANIMATION) {
        return "Whoa, the wind is tossing me!";
      }
      if (currentAnimation === WATERING_ANIMATION) {
        return 'Ahhh, that cool drink hits!';
      }
      return null;
    })();

    if (!message) {
      setSpeechVisible(false);
      lastSpeechAnimationRef.current = currentAnimation;
      return;
    }

    if (lastSpeechAnimationRef.current === currentAnimation) {
      return;
    }

    lastSpeechAnimationRef.current = currentAnimation;
    setSpeechMessage(message);
    setSpeechVisible(true);
    speechTimeoutRef.current = setTimeout(() => {
      setSpeechVisible(false);
      speechTimeoutRef.current = null;
    }, 2500);

    return () => {
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
      }
    };
  }, [currentAnimation, humidity, soilMoisture]);

  useEffect(() => {
    if (!incomingAnimation || !incomingReady || isTransitioningRef.current) {
      return;
    }

    isTransitioningRef.current = true;
    // Circular reveal from pot center: compute required final scale
    const circleBaseSize = 110; // slightly smaller base to enlarge effective scale
    const maxDistance = Math.sqrt(windowWidth * windowWidth + windowHeight * windowHeight);
    const finalScale = (maxDistance / circleBaseSize) * 1.4; // larger overshoot to cover edges faster

    revealScale.setValue(0.01); // start a bit larger to avoid initial edge glimpse
    incomingOpacity.setValue(1);
    // Softly dim the current layer while revealing the new one
    Animated.parallel([
      Animated.timing(revealScale, {
        toValue: finalScale,
        duration: 560, // slower, smoother reveal
        useNativeDriver: true,
      }),
      Animated.timing(currentOpacity, {
        toValue: 0.1, // fade a bit more
        duration: 560, // match reveal duration for seamless blend
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentAnimation(animationSource);
      currentOpacity.setValue(1);
      setTimeout(() => {
        setIncomingAnimation(null);
        incomingOpacity.setValue(0);
        setIncomingReady(false);
        isTransitioningRef.current = false;
        revealScale.setValue(0);
      }, 60);
    });
  }, [animationSource, incomingAnimation, incomingReady, windowWidth, windowHeight, currentOpacity, incomingOpacity, revealScale]);

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <View style={styles.container}>
        {/* Camera access is via the initial screen; no camera button here */}
        {/* Daylight toggle (top-left) */}
        <TouchableOpacity
          style={styles.dayToggleButton}
          activeOpacity={0.8}
          onPress={() => {
            const next = !isSnowy;
            setIsSnowy(next);
            Animated.timing(bgFade, {
              toValue: next ? 1 : 0,
              duration: 700,
              useNativeDriver: true,
            }).start();
          }}
        >
          <Text style={styles.dayToggleText}>{isSnowy ? '☀︎' : '❄︎'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sensorDialogButton}
          onPress={() => setSensorDialogVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.sensorDialogButtonText}>Sensors</Text>
        </TouchableOpacity>

        {/* Background Image with crossfade */}
        <Image
          source={require('../../assets/images/sunny_window.png')}
          style={styles.backgroundImage}
          contentFit="cover"
        />
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: bgFade, zIndex: 1 }]}>
          <Image
            source={require('../../assets/images/snowy_window_1.png')}
            style={styles.backgroundImage}
            contentFit="cover"
          />
        </Animated.View>
        {speechVisible && speechMessage ? (
          <View style={styles.speechBubbleWrapper}>
            <Image
              source={require('../../assets/images/speech.png')}
              style={styles.speechBubbleImage}
              contentFit="contain"
            />
            <Text numberOfLines={2} style={styles.speechBubbleText}>
              {speechMessage}
            </Text>
          </View>
        ) : null}
        {/* Plant animation overlay (condition-based GIF) */}
        {currentAnimation && (
          <Animated.View
            style={[styles.layerImage, { zIndex: 2, opacity: currentOpacity }]}
          >
            <Image
              source={currentAnimation}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          </Animated.View>
        )}
        {incomingAnimation && (
          <MaskedView
            style={[styles.layerImage, { zIndex: 3 }]}
            maskElement={
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <Animated.View
                  style={[
                    styles.revealCircle,
                    {
                      transform: [
                        { translateX: -60 }, // half of base size (120)
                        { translateY: -60 },
                        { scale: revealScale },
                      ],
                      left: (windowWidth) * 0.5,
                      top: (windowHeight) * 0.56, // approx pot center
                    },
                  ]}
                />
              </View>
            }
          >
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: incomingOpacity }]}>
              <Image
                source={incomingAnimation}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                onLoad={() => setIncomingReady(true)}
                onError={() => setIncomingReady(true)}
              />
            </Animated.View>
          </MaskedView>
        )}

        <Modal
          visible={sensorDialogVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSensorDialogVisible(false)}
        >
          <Pressable style={styles.sensorModalOverlay} onPress={() => setSensorDialogVisible(false)}>
            <Pressable style={styles.sensorModalContent} onPress={() => {}}>
              <Text style={styles.sensorModalTitle}>Live Sensor Values</Text>
              <View style={styles.sensorModalDivider} />
              <View style={styles.sensorModalList}>
                <Text style={styles.sensorModalItem}>Soil Moisture: {rawVitals.soilMoisture}</Text>
                <Text style={styles.sensorModalItem}>Temperature: {rawVitals.temperature}°C</Text>
                <Text style={styles.sensorModalItem}>Humidity: {rawVitals.humidity}%</Text>
                <Text style={styles.sensorModalItem}>Air Quality (MQ2): {rawVitals.mq2}</Text>
                <Text style={styles.sensorModalItem}>Raindrop: {rawVitals.raindrop}</Text>
                <Text style={styles.sensorModalItem}>Bio Signal: {rawVitals.bio}</Text>
                <Text style={styles.sensorModalItem}>
                  Timestamp: {rawVitals.timestamp.toLocaleTimeString()}
                </Text>
              </View>
              <TouchableOpacity style={styles.sensorModalClose} onPress={() => setSensorDialogVisible(false)}>
                <Text style={styles.sensorModalCloseText}>Close</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Health bars & sensor icons */}
        {scores && (
          <View style={styles.healthBarsContainer}>
            <HealthBars scores={scores} rawVitals={rawVitals} />
          </View>
        )}
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
  healthBarsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.xl,
    zIndex: 6,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    justifyContent: 'center',
  },
  revealCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#000', // Mask uses alpha; black shows, transparent hides
  },
  sensorDialogButton: {
    position: 'absolute',
    top: spacing.md + 56,
    right: spacing.md,
    zIndex: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 34, 34, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  sensorDialogButtonText: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  sensorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sensorModalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#222',
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: '#fff',
  },
  sensorModalList: {
    marginTop: spacing.sm,
  },
  sensorModalTitle: {
    fontFamily: 'monospace',
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sensorModalDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: spacing.sm,
  },
  sensorModalItem: {
    fontFamily: 'monospace',
    color: '#f5f5f5',
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  sensorModalClose: {
    marginTop: spacing.md,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: '#f44336',
  },
  sensorModalCloseText: {
    color: '#fff',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    fontSize: 14,
  },
  dayToggleButton: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    zIndex: 21,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  dayToggleText: {
    color: '#fff',
    fontSize: 18,
  },
  speechBubbleWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 25,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  speechBubbleImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  speechBubbleText: {
    position: 'absolute',
    top: '35%',
    transform: [{ translateX: -70 }, { translateY: -50 }],
    width: '48%',
    textAlign: 'center',
    color: '#2f1b0c',
    fontSize: 16,
    fontFamily: 'SuperJoyful',
    lineHeight: 20,
  },
});
