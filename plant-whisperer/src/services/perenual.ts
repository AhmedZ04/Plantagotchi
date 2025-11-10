import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CareFields = {
  watering?: string | null;
  watering_general_benchmark?: { value?: string | number | null; unit?: string | null } | null;
  care_level?: string | null;
  hardiness?: { min?: string | number | null; max?: string | number | null } | null;
  source: { idUsed: number; note?: string };
};

type PerenualSearchItem = {
  id: number;
  common_name?: string | null;
  scientific_name?: string | string[] | null;
};

type PerenualDetails = {
  id: number;
  watering?: string | null;
  watering_general_benchmark?: { value?: string | number | null; unit?: string | null } | null;
  care_level?: string | null;
  hardiness?: { min?: string | number | null; max?: string | number | null } | null;
};

function getKey(): string {
  const key = (Constants.expoConfig?.extra as any)?.expoPublicPerenualApiKey || process.env.EXPO_PUBLIC_PERENUAL_API_KEY;
  if (!key) throw new Error('Missing Perenual API key');
  return key;
}

function normalizeName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().toLowerCase();
}

async function fetchWithRetry(url: string, attempts = 3): Promise<Response> {
  let lastError: any;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        const retryAfter = res.headers.get('retry-after');
        const delayMs = retryAfter ? Math.min(5000, Math.max(500, parseInt(retryAfter, 10) * 1000)) : 500 * Math.pow(2, i);
        await new Promise((r) => setTimeout(r, delayMs));
        lastError = new Error('Perenual 429 rate limit');
        continue;
      }
      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status}`);
        if (res.status >= 500 && res.status < 600) {
          await new Promise((r) => setTimeout(r, 500 * Math.pow(2, i)));
          continue;
        }
      }
      return res;
    } catch (e) {
      lastError = e;
      await new Promise((r) => setTimeout(r, 400 * Math.pow(2, i)));
    }
  }
  throw lastError ?? new Error('Network error');
}

async function searchSpecies(name: string): Promise<PerenualSearchItem[]> {
  const key = getKey();
  const url = `https://perenual.com/api/v2/species-list?key=${encodeURIComponent(key)}&q=${encodeURIComponent(name)}&per_page=15`;
  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error(`Perenual search failed: ${res.status}`);
  const json = await res.json();
  const data = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
  return data as PerenualSearchItem[];
}

async function getDetails(id: number): Promise<PerenualDetails> {
  const key = getKey();
  const url = `https://perenual.com/api/v2/species/details/${id}?key=${encodeURIComponent(key)}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error(`Perenual details failed: ${res.status}`);
  return (await res.json()) as PerenualDetails;
}

const CARE_CACHE_PREFIX = 'care:v1:';
const DEFAULT_FALLBACK_QUERY = 'Epipremnum aureum';
const FALLBACK_ID_CACHE_KEY = 'perenual:fallbackId';

async function getCachedCare(name: string): Promise<CareFields | null> {
  try {
    const key = CARE_CACHE_PREFIX + normalizeName(name);
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as CareFields) : null;
  } catch {
    return null;
  }
}

async function setCachedCare(name: string, care: CareFields): Promise<void> {
  try {
    const key = CARE_CACHE_PREFIX + normalizeName(name);
    await AsyncStorage.setItem(key, JSON.stringify(care));
  } catch {}
}

async function getCachedFallbackId(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(FALLBACK_ID_CACHE_KEY);
    return raw ? parseInt(raw, 10) : null;
  } catch { return null; }
}

async function setCachedFallbackId(id: number): Promise<void> {
  try { await AsyncStorage.setItem(FALLBACK_ID_CACHE_KEY, String(id)); } catch {}
}

export async function fetchCareFieldsForName(name: string, commonName?: string): Promise<CareFields | null> {
  const cacheKey = normalizeName(name);
  const cached = await getCachedCare(name);
  if (cached) return cached;

  const trySearch = async (q: string): Promise<PerenualSearchItem[]> => {
    try { return await searchSpecies(q); } catch { return []; }
  };

  let results: PerenualSearchItem[] = await trySearch(name);
  if ((!results || results.length === 0) && commonName) {
    results = await trySearch(commonName);
    if ((!results || results.length === 0)) {
      const tokens = commonName.replace(/[^A-Za-z0-9\s-]/g, '').split(/\s+/).map(t => t.trim()).filter(Boolean);
      for (const t of tokens) { const r = await trySearch(t); if (r && r.length) { results = r; break; } }
    }
  }
  if (!results || results.length === 0) throw new Error(`No Perenual match for "${name}"`);

  const lower = normalizeName(name);
  const exact = results.find(r => normalizeName(Array.isArray(r.scientific_name) ? r.scientific_name.join(' ') : (r.scientific_name ?? '')) === lower) || results[0];

  let candidate: PerenualSearchItem | undefined = exact && exact.id ? exact : results[0];
  if (!candidate || candidate.id > 3000) {
    const under = results.find(r => typeof r.id === 'number' && r.id <= 3000);
    if (under) candidate = under;
  }

  let idToUse = candidate?.id ?? exact.id;
  let note: string | undefined;
  if (idToUse > 3000) {
    // Fallback to Golden Pothos
    const cachedFallback = await getCachedFallbackId();
    if (cachedFallback && cachedFallback > 0) {
      idToUse = cachedFallback;
    } else {
      const fb = await trySearch(DEFAULT_FALLBACK_QUERY);
      if (!fb || fb.length === 0) throw new Error('Fallback species not found in Perenual');
      idToUse = fb[0].id;
      setCachedFallbackId(idToUse).catch(() => {});
    }
    note = `Free tier fallback used (${DEFAULT_FALLBACK_QUERY}; original id ${candidate?.id ?? exact.id} > 3000)`;
  }

  const details = await getDetails(idToUse);
  const care: CareFields = {
    watering: details.watering ?? null,
    watering_general_benchmark: details.watering_general_benchmark ?? null,
    care_level: details.care_level ?? null,
    hardiness: details.hardiness ?? null,
    source: { idUsed: idToUse, note },
  };
  await setCachedCare(name, care).catch(() => {});
  return care;
}

