import Constants from 'expo-constants';

type PlantNetSuggestion = {
  score: number;
  species: {
    scientificNameWithoutAuthor: string;
    scientificNameAuthorship?: string;
    commonNames?: string[];
  };
};

export type PlantNetResponse = {
  query: any;
  language: string;
  bestMatch: string;
  results: PlantNetSuggestion[];
};

const API_BASE = 'https://my-api.plantnet.org/v2/identify';
// Common projects: "all" (global dataset). You can switch to region datasets later.
const PROJECT = 'all';

function getApiKey() {
  const key = (Constants.expoConfig?.extra as any)?.expoPublicPlantNetApiKey || process.env.EXPO_PUBLIC_PLANTNET_API_KEY;
  if (!key) throw new Error('Missing PlantNet API key. Set expoPublicPlantNetApiKey in app.json extra.');
  return key;
}

/** Upload a local image URI to PlantNet as multipart/form-data */
export async function identifyPlantFromUri(localUri: string, organs: string[] = ['leaf']) {
  const apiKey = getApiKey();
  const url = `${API_BASE}/${PROJECT}?api-key=${apiKey}`;

  const form = new FormData();
  // React Native needs name/type for file parts
  form.append('images', {
    // @ts-ignore - React Native File type
    uri: localUri,
    name: 'plant.jpg',
    type: 'image/jpeg',
  } as any);

  // Append organs as form fields (not in the query string)
  if (organs && organs.length > 0) {
    for (const organ of organs) {
      form.append('organs', organ as any);
    }
  }

  const res = await fetch(url, {
    method: 'POST',
    // Let React Native set the correct Content-Type with boundary
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PlantNet error ${res.status}: ${text}`);
  }
  const data = (await res.json()) as PlantNetResponse;
  return data;
}
