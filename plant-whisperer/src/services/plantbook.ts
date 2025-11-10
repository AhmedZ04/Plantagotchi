import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PlantbookFields = {
  max_temp?: number | null;
  min_temp?: number | null;
  max_env_humid?: number | null;
  min_env_humid?: number | null;
  max_soil_moist?: number | null;
  min_soil_moist?: number | null;
  pid?: string;
};

type PlantbookSearchResult = { pid: string; display_pid: string; alias?: string };

function getToken(): string {
  const token = (Constants.expoConfig?.extra as any)?.expoPublicPlantbookToken || process.env.EXPO_PUBLIC_PLANTBOOK_TOKEN;
  if (!token) throw new Error('Missing Plantbook API token');
  return token;
}

function normalize(s: string): string { return s.replace(/\s+/g, ' ').trim().toLowerCase(); }

async function fetchPB(url: string): Promise<Response> {
  const token = getToken();
  return fetch(url, { headers: { Authorization: `Token ${token}` } });
}

const PB_CACHE_PREFIX = 'pb:v1:';

async function getCached(name: string): Promise<PlantbookFields | null> {
  try { const raw = await AsyncStorage.getItem(PB_CACHE_PREFIX + normalize(name)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
async function setCached(name: string, data: PlantbookFields): Promise<void> {
  try { await AsyncStorage.setItem(PB_CACHE_PREFIX + normalize(name), JSON.stringify(data)); } catch {}
}

export async function fetchPlantbookForName(name: string, commonName?: string): Promise<PlantbookFields | null> {
  const cached = await getCached(name);
  if (cached) return cached;

  const canon = normalize(name);
  const tokens: string[] = [];
  if (canon) tokens.push(canon);
  if (commonName) {
    const cleaned = commonName.replace(/[^A-Za-z0-9\s-]/g, ' ');
    const parts = cleaned.split(/\s+/).map(t => t.trim()).filter(Boolean);
    if (parts.length) tokens.push(parts.join(' '), ...parts);
  }

  let pid: string | null = null;
  for (const q of tokens) {
    const res = await fetchPB(`https://open.plantbook.io/api/v1/plant/search?alias=${encodeURIComponent(q)}&limit=5`);
    if (!res.ok) continue;
    const json = await res.json();
    const results: PlantbookSearchResult[] = json?.results || [];
    if (results.length > 0) {
      const exact = results.find(r => normalize(r.display_pid) === canon);
      pid = (exact || results[0]).pid;
      break;
    }
  }
  if (!pid) return null;

  const detailRes = await fetchPB(`https://open.plantbook.io/api/v1/plant/detail/${encodeURIComponent(pid)}/`);
  if (!detailRes.ok) throw new Error(`Plantbook details failed: ${detailRes.status}`);
  const d = await detailRes.json();
  const data: PlantbookFields = {
    pid,
    max_temp: d?.max_temp ?? null,
    min_temp: d?.min_temp ?? null,
    max_env_humid: d?.max_env_humid ?? null,
    min_env_humid: d?.min_env_humid ?? null,
    max_soil_moist: d?.max_soil_moist ?? null,
    min_soil_moist: d?.min_soil_moist ?? null,
  };
  await setCached(name, data).catch(() => {});
  return data;
}

