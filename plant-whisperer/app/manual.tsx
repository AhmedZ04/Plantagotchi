import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function ManualScreen() {
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Choose your plant manually</Text>
      {/* TODO: Autocomplete list or dropdown of common species */}
      <TouchableOpacity onPress={() => router.back()} style={styles.btn}>
        <Text style={{ color: 'white' }}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  btn: { marginTop: 12, backgroundColor: '#2f7d32', padding: 12, borderRadius: 8 }
});

