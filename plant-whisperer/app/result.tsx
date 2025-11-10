import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchCareFieldsForName, CareFields } from '@/src/services/perenual';
import { fetchPlantbookForName, PlantbookFields } from '@/src/services/plantbook';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { identifyPlantFromUri, PlantNetResponse } from '../lib/plantnet';

export default function ResultScreen() {
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [resp, setResp] = useState<PlantNetResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [care, setCare] = useState<CareFields | null>(null);
  const [pb, setPb] = useState<PlantbookFields | null>(null);
  const [apisLoaded, setApisLoaded] = useState(false);
  const [processingVisible, setProcessingVisible] = useState(true);
  const [minDelayDone, setMinDelayDone] = useState(false);
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [tipIdx, setTipIdx] = useState(0);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      try {
        if (!uri) throw new Error('No image URI provided.');
        // Exaggerated loader: enforce a minimum processing window
        setProcessingVisible(true);
        setMinDelayDone(false);
        setSummaryVisible(false);
        const minTimer = setTimeout(() => setMinDelayDone(true), 3000);
        const data = await identifyPlantFromUri(uri as string);
        setResp(data);
        const top = data?.results?.[0];
        const sciNoAuthor = top?.species?.scientificNameWithoutAuthor;
        const canon = sciNoAuthor && typeof sciNoAuthor === 'string' ? sciNoAuthor.replace(/\s+/g, ' ').trim() : null;
        if (canon) {
          // Fetch Perenual + Plantbook and show brief JSON before navigating
          try {
            const [careRes, pbRes] = await Promise.allSettled([
              fetchCareFieldsForName(canon, top?.species?.commonNames?.[0]),
              fetchPlantbookForName(canon, top?.species?.commonNames?.[0]),
            ]);
            if (careRes.status === 'fulfilled') setCare(careRes.value);
            if (pbRes.status === 'fulfilled') setPb(pbRes.value);
          } catch {}
          setApisLoaded(true);
          try { await AsyncStorage.setItem('selectedSpeciesName', canon); } catch {}
          // Reveal modern summary popup once both API load and min delay complete
          // Actual reveal is handled by the effect watching [apisLoaded, minDelayDone]
        }
      } catch (e: any) {
        setErr(e.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [uri]);

  // When both API calls are loaded and minimum delay elapsed, show summary
  useEffect(() => {
    if (apisLoaded && minDelayDone) {
      setProcessingVisible(false);
      setSummaryVisible(true);
    }
  }, [apisLoaded, minDelayDone]);

  // Animate the plant icon pulse for the processing overlay
  useEffect(() => {
    if (!processingVisible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [processingVisible]);

  // Rotate through fun tips while processing
  useEffect(() => {
    if (!processingVisible) return;
    const id = setInterval(() => setTipIdx((i) => (i + 1) % LOADING_TIPS.length), 1100);
    return () => clearInterval(id);
  }, [processingVisible]);

  // Auto-advance to dashboard a few seconds after summary appears
  useEffect(() => {
    if (!summaryVisible) return;
    const t = setTimeout(() => router.replace('/dashboard'), 3500);
    return () => clearTimeout(t);
  }, [summaryVisible]);

  const top = resp?.results?.[0];
  const title = top
    ? `${top.species.scientificNameWithoutAuthor}${top.species.scientificNameAuthorship ? ' ' + top.species.scientificNameAuthorship : ''}`
    : 'No match';

  const common = top?.species.commonNames?.[0];

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}><Text style={{color:'white'}}>← Back</Text></TouchableOpacity>
        <Text style={styles.h1}>Identification</Text>
      </View>

      {uri ? <Image source={{ uri: uri as string }} style={styles.preview} /> : null}

      {loading && <ActivityIndicator size="large" style={{ marginTop: 16 }} />}
      {err && <Text style={{ color: 'tomato', marginTop: 12 }}>{err}</Text>}

      {resp && !loading && !err && (
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {common ? <Text style={styles.subtitle}>{common}</Text> : null}
          <Text style={{ marginTop: 8, opacity: 0.8 }}>
            Confidence: {Math.round((top?.score ?? 0) * 100)}%
          </Text>

          {/* We now show metrics in a themed popup after processing, instead of inline JSON */}

          <View style={{ marginTop: 16 }}>
            <Text style={styles.h2}>Alternatives</Text>
            {resp.results.slice(1, 5).map((s, i) => (
              <Text key={i} style={styles.alt}>
                {Math.round(s.score * 100)}% — {s.species.scientificNameWithoutAuthor}
                {s.species.commonNames?.[0] ? ` (${s.species.commonNames[0]})` : ''}
              </Text>
            ))}
          </View>
        </View>
      )}

      {/* Full-screen processing overlay */}
      {processingVisible && !err && (
        <View style={styles.processingBackdrop}>
          <View style={styles.processingCard}>
            <Animated.Text
              style={{
                fontSize: 56,
                transform: [{ scale: pulse }],
                textAlign: 'center',
              }}
            >
              🪴
            </Animated.Text>
            <Text style={styles.processingTitle}>Fetching care data for your plant</Text>
            <Text style={styles.processingSub}>{LOADING_TIPS[tipIdx]}</Text>
            <ActivityIndicator size="large" color="#77dd77" style={{ marginTop: 14 }} />
          </View>
        </View>
      )}

      {/* Modern summary popup */}
      <Modal visible={summaryVisible} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Your data is ready</Text>
            <Text style={styles.modalSubtitle}>Here’s a quick care overview</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Care Overview</Text>
              <View style={styles.metricsGrid}>
                <MetricChip label="Watering" value={fmt(care?.watering)} icon="💧" />
                <MetricChip label="Benchmark" value={fmtBenchmark(care)} icon="⏱️" />
                <MetricChip label="Care Level" value={fmt(care?.care_level)} icon="🪴" />
                <MetricChip label="Hardiness" value={fmtHardiness(care)} icon="❄️" />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Environment Ranges</Text>
              <View style={styles.metricsGrid}>
                <MetricChip label="Temp" value={fmtRange(pb?.min_temp, pb?.max_temp, '°C')} icon="🌡️" />
                <MetricChip label="Humidity" value={fmtRange(pb?.min_env_humid, pb?.max_env_humid, '%')} icon="💨" />
                <MetricChip label="Soil Moist." value={fmtRange(pb?.min_soil_moist, pb?.max_soil_moist)} icon="🌱" />
              </View>
            </View>

            <Pressable style={styles.modalButton} onPress={() => router.replace('/dashboard')}>
              <Text style={styles.modalButtonText}>Continue to Dashboard</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  back: { backgroundColor: '#2f7d32', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 8 },
  h1: { fontSize: 22, fontWeight: '800' },
  preview: { width: '100%', height: 260, borderRadius: 12, marginTop: 8, backgroundColor: '#111' },
  card: { backgroundColor: '#f6fff7', padding: 16, borderRadius: 12, marginTop: 16 },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 16, color: '#2f7d32', marginTop: 4 },
  h2: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  alt: { marginBottom: 4 },
  processingBackdrop: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(6,16,11,0.92)',
    justifyContent: 'center', alignItems: 'center',
  },
  processingCard: {
    width: '86%',
    backgroundColor: '#10251b',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#1f3b2e',
  },
  processingTitle: { color: 'white', textAlign: 'center', fontSize: 18, fontWeight: '800', marginTop: 8 },
  processingSub: { color: '#a8e6a3', textAlign: 'center', marginTop: 6 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#0f1f17',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#1f3b2e',
  },
  modalTitle: { color: 'white', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  modalSubtitle: { color: '#a7c8b3', fontSize: 13, textAlign: 'center', marginTop: 4 },
  section: { marginTop: 14 },
  sectionTitle: { color: '#cde8d6', fontWeight: '700', marginBottom: 8 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, marginTop: -6 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#12281d', borderColor: '#1f3b2e', borderWidth: 1,
    paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12,
    marginHorizontal: 6, marginTop: 6,
  },
  chipIcon: { fontSize: 16 },
  chipTextLabel: { color: '#9cc9b1', fontSize: 12 },
  chipTextValue: { color: 'white', fontSize: 14, fontWeight: '700' },
  modalButton: {
    marginTop: 16,
    backgroundColor: '#2f7d32', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  modalButtonText: { color: 'white', fontWeight: '800' },
});

const LOADING_TIPS = [
  'Analyzing your plant photo…',
  'Finding a species match…',
  'Fetching care data…',
  'Tuning environment ranges…',
  'Almost there…',
];

function fmt(v: any): string {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}

function fmtBenchmark(care?: CareFields | null): string {
  const v = care?.watering_general_benchmark?.value;
  const u = care?.watering_general_benchmark?.unit;
  if (v === null || v === undefined) return '—';
  return `${v}${u ? ' ' + u : ''}`;
}

function fmtHardiness(care?: CareFields | null): string {
  const min = care?.hardiness?.min;
  const max = care?.hardiness?.max;
  if (min == null && max == null) return '—';
  if (min != null && max != null) return `${min}–${max}`;
  return String(min ?? max);
}

function fmtRange(min?: number | null, max?: number | null, unit?: string): string {
  if (min == null && max == null) return '—';
  const u = unit || '';
  if (min != null && max != null) return `${min}${u}–${max}${u}`;
  if (min != null) return `≥ ${min}${u}`;
  return `≤ ${max}${u}`;
}

function MetricChip({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipIcon}>{icon}</Text>
      <View>
        <Text style={styles.chipTextLabel}>{label}</Text>
        <Text style={styles.chipTextValue}>{value}</Text>
      </View>
    </View>
  );
}


