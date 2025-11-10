import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { identifyPlantFromUri, PlantNetResponse } from '../lib/plantnet';
import { fetchCareFieldsForName, CareFields } from '@/src/services/perenual';
import { fetchPlantbookForName, PlantbookFields } from '@/src/services/plantbook';

export default function ResultScreen() {
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [resp, setResp] = useState<PlantNetResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // Canonicalized species name for use with external APIs (e.g., Perenual)
  const [canonicalName, setCanonicalName] = useState<string | null>(null);
  const [care, setCare] = useState<CareFields | null>(null);
  const [careErr, setCareErr] = useState<string | null>(null);
  const [pb, setPb] = useState<PlantbookFields | null>(null);
  const [pbErr, setPbErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!uri) throw new Error('No image URI provided.');
        const data = await identifyPlantFromUri(uri as string);
        setResp(data);
        // Normalize species name from the top suggestion for downstream API queries
        const top = data?.results?.[0];
        const sciNoAuthor = top?.species?.scientificNameWithoutAuthor;
        if (sciNoAuthor && typeof sciNoAuthor === 'string') {
          const canon = normalizeSpeciesName(sciNoAuthor);
          setCanonicalName(canon);
          try {
            const fields = await fetchCareFieldsForName(canon, top?.species?.commonNames?.[0]);
            setCare(fields);
            setCareErr(null);
          } catch (perErr: any) {
            setCare(null);
            setCareErr(perErr?.message ?? String(perErr));
          }
          // Fetch Plantbook numeric targets
          try {
            const pbFields = await fetchPlantbookForName(canon, top?.species?.commonNames?.[0]);
            setPb(pbFields);
            setPbErr(null);
          } catch (errPb: any) {
            setPb(null);
            setPbErr(errPb?.message ?? String(errPb));
          }
        } else {
          setCanonicalName(null);
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
  // Helper to normalize scientific names for search (collapse whitespace, trim)
  function normalizeSpeciesName(name: string): string {
    return name.replace(/\s+/g, ' ').trim();
  }

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
          {canonicalName ? (
            <Text style={{ marginTop: 4, opacity: 0.7 }}>Canonical: {canonicalName}</Text>
          ) : null}
          <Text style={{ marginTop: 8, opacity: 0.8 }}>
            Confidence: {Math.round((top?.score ?? 0) * 100)}%
          </Text>

          {/* Combined care fields: Perenual (watering, growth_rate) + Plantbook numeric targets */}
          {careErr ? (
            <Text style={{ color: 'tomato', marginTop: 8 }}>Perenual error: {careErr}</Text>
          ) : null}
          {pbErr ? (
            <Text style={{ color: 'tomato', marginTop: 8 }}>Plantbook error: {pbErr}</Text>
          ) : null}
          {(care || pb) ? (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.h2}>Care Targets</Text>
              <Text style={styles.jsonBlock}>{JSON.stringify({
                watering: care?.watering ?? null,
                watering_general_benchmark_value: care?.watering_general_benchmark?.value ?? null,
                watering_general_benchmark_unit: care?.watering_general_benchmark?.unit ?? null,
                growth_rate: care?.growth_rate ?? null,
                max_temp: pb?.max_temp ?? null,
                min_temp: pb?.min_temp ?? null,
                max_env_humid: pb?.max_env_humid ?? null,
                min_env_humid: pb?.min_env_humid ?? null,
                max_soil_moist: pb?.max_soil_moist ?? null,
                min_soil_moist: pb?.min_soil_moist ?? null,
              }, null, 2)}</Text>
            </View>
          ) : null}

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
  alt: { marginBottom: 4 },
  jsonBlock: { fontFamily: 'monospace', fontSize: 12, marginTop: 6, color: '#333' }
});
