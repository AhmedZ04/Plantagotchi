import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

type PerenualSearchItem = {
  id: number;
  common_name?: string | null;
  // Perenual sometimes returns an array for scientific_name in list endpoint
  scientific_name?: string | string[] | null;
};

type PerenualDetails = {
  id: number;
  watering?: string | null;
  watering_general_benchmark?: { value?: string | number | null; unit?: string | null } | null;
  pruning_month?: string[] | null;
  growth_rate?: string | null;
  care_level?: string | null;
  pest_susceptibility?: string[] | null;
  soil?: string[] | null;
  hardiness?: { min?: string | number | null; max?: string | number | null } | null;
};

export type CareFields = {
  watering?: string | null;
  watering_general_benchmark?: { value?: string | number | null; unit?: string | null } | null;
  pruning_month?: string[] | null;
  growth_rate?: string | null;
  care_level?: string | null;
  pest_susceptibility?: string[] | null;
  soil?: string[] | null;
  hardiness?: { min?: string | number | null; max?: string | number | null } | null;
  source: { idUsed: number; note?: string };
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
        // Rate limited — respect Retry-After if present
        const retryAfter = res.headers.get('retry-after');
        const delayMs = retryAfter ? Math.min(5000, Math.max(500, parseInt(retryAfter, 10) * 1000)) : 500 * Math.pow(2, i);
        await new Promise((r) => setTimeout(r, delayMs));
        lastError = new Error(`Perenual 429 rate limit`);
        continue;
      }
      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status}`);
        // Retry transient 5xx
        if (res.status >= 500 && res.status < 600) {
          await new Promise((r) => setTimeout(r, 500 * Math.pow(2, i)));
          continue;
        }
        return res; // Return non-ok so caller can surface meaningful message
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
  // Request a few results so we can pick an id <= 3000 when possible (free tier)
  const url = `https://perenual.com/api/v2/species-list?key=${encodeURIComponent(key)}&q=${encodeURIComponent(name)}&per_page=15`;
  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error(`Perenual search failed: ${res.status}`);
  const json = await res.json();
  const data = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json)
      ? json
      : [];
  return data as PerenualSearchItem[];
}

async function getDetails(id: number): Promise<PerenualDetails> {
  const key = getKey();
  const url = `https://perenual.com/api/v2/species/details/${id}?key=${encodeURIComponent(key)}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error(`Perenual details failed: ${res.status}`);
  return (await res.json()) as PerenualDetails;
}

// Simple caching helpers
const CARE_CACHE_PREFIX = 'care:v1:';
// Use Epipremnum aureum (golden pothos) as the free-tier fallback species
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
  } catch {
    // ignore cache errors
  }
}

async function getCachedFallbackId(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(FALLBACK_ID_CACHE_KEY);
    return raw ? parseInt(raw, 10) : null;
  } catch {
    return null;
  }
}

async function setCachedFallbackId(id: number): Promise<void> {
  try {
    await AsyncStorage.setItem(FALLBACK_ID_CACHE_KEY, String(id));
  } catch {
    // ignore cache errors
  }
}

/**
 * Fetch care fields with free-tier fallback.
 * If the best match has id > 3000, use Monstera deliciosa instead.
 */
// In-memory single-flight to avoid duplicate concurrent requests per name
const inflight = new Map<string, Promise<CareFields>>();

export async function fetchCareFieldsForName(name: string, commonName?: string): Promise<CareFields | null> {
  const cacheKey = normalizeName(name);
  if (inflight.has(cacheKey)) {
    return inflight.get(cacheKey)!;
  }

  // Serve from cache if available
  const cached = await getCachedCare(name);
  if (cached) {
    return cached;
  }
  // Helper to safely run a search and ignore network/shape errors
  const trySearch = async (q: string): Promise<PerenualSearchItem[]> => {
    try {
      return await searchSpecies(q);
    } catch {
      return [];
    }
  };

  // 1) Try full scientific (canonical) name
  let results: PerenualSearchItem[] = await trySearch(name);

  // 2) If no hit and commonName provided, try full common name
  if ((!results || results.length === 0) && commonName) {
    results = await trySearch(commonName);
  }

  // 3) If still no hit and commonName provided, try tokenized search (first word then others)
  if ((!results || results.length === 0) && commonName) {
    const tokens = commonName
      // Keep ASCII letters/numbers/spaces/hyphens (safer across JS engines)
      .replace(/[^A-Za-z0-9\s-]/g, '')
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    for (const token of tokens) {
      const r = await trySearch(token);
      if (r && r.length > 0) {
        results = r;
        break;
      }
    }
  }

  if (!results || results.length === 0) {
    throw new Error(`No Perenual match for "${name}"${commonName ? ` or common name "${commonName}"` : ''}`);
  }

  // Prefer exact scientific name match (case-insensitive), else first result
  const lower = normalizeName(name);
  const exact = results.find((r) => {
    const sciField = r.scientific_name;
    const sci = Array.isArray(sciField) ? sciField.join(' ') : sciField ?? '';
    if (typeof sci !== 'string') return false;
    return normalizeName(sci) === lower;
  }) || results[0];

  // Prefer a result within free-tier range when possible
  let candidate: PerenualSearchItem | undefined = exact && exact.id ? exact : results[0];
  if (!candidate || candidate.id > 3000) {
    const under = results.find((r) => typeof r.id === 'number' && r.id <= 3000);
    if (under) candidate = under;
  }

  let idToUse = candidate?.id ?? exact.id;
  let note: string | undefined;

  if (idToUse > 3000) {
    // Free tier fallback to Epipremnum aureum (golden pothos)
    const cachedFallback = await getCachedFallbackId();
    if (cachedFallback && cachedFallback > 0) {
      idToUse = cachedFallback;
    } else {
      const fallbackSearch = await searchSpecies(DEFAULT_FALLBACK_QUERY);
      const fallback = fallbackSearch && fallbackSearch[0];
      if (!fallback) {
        throw new Error(`Fallback species (${DEFAULT_FALLBACK_QUERY}) not found in Perenual`);
      }
      idToUse = fallback.id;
      setCachedFallbackId(idToUse).catch(() => {});
    }
    note = `Free tier fallback used (${DEFAULT_FALLBACK_QUERY}; original id ${candidate?.id ?? exact.id} > 3000)`;
  }

  const promise = (async () => {
    const details = await getDetails(idToUse);
    const care: CareFields = {
      watering: details.watering ?? null,
      watering_general_benchmark: details.watering_general_benchmark ?? null,
      pruning_month: details.pruning_month ?? null,
      growth_rate: details.growth_rate ?? null,
      care_level: details.care_level ?? null,
      pest_susceptibility: details.pest_susceptibility ?? null,
      soil: details.soil ?? null,
      hardiness: details.hardiness ?? null,
      source: { idUsed: idToUse, note },
    };
    // Cache by canonical (requested) name regardless of fallback id
    setCachedCare(name, care).catch(() => {});
    return care;
  })();

  inflight.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(cacheKey);
  }
}
