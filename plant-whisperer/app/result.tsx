import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchCareFieldsForName, CareFields } from '@/src/services/perenual';
import { fetchPlantbookForName, PlantbookFields } from '@/src/services/plantbook';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

  useEffect(() => {
    (async () => {
      try {
        if (!uri) throw new Error('No image URI provided.');
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
          // Brief pause so user can see JSON, then navigate
          setTimeout(() => router.replace('/dashboard'), 1200);
        }
      } catch (e: any) {
        setErr(e.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [uri]);

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

          {/* Brief JSON of Perenual + Plantbook fields before navigating */}
          {apisLoaded && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.h2}>Care Summary</Text>
              <Text style={styles.jsonBlock}>{JSON.stringify({
                perenual: {
                  watering: care?.watering ?? null,
                  watering_general_benchmark_value: care?.watering_general_benchmark?.value ?? null,
                  watering_general_benchmark_unit: care?.watering_general_benchmark?.unit ?? null,
                  care_level: care?.care_level ?? null,
                  hardiness_min: care?.hardiness?.min ?? null,
                  hardiness_max: care?.hardiness?.max ?? null,
                },
                plantbook: {
                  max_temp: pb?.max_temp ?? null,
                  min_temp: pb?.min_temp ?? null,
                  max_env_humid: pb?.max_env_humid ?? null,
                  min_env_humid: pb?.min_env_humid ?? null,
                  max_soil_moist: pb?.max_soil_moist ?? null,
                  min_soil_moist: pb?.min_soil_moist ?? null,
                }
              }, null, 2)}</Text>
            </View>
          )}

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
  alt: { marginBottom: 4 }
});


