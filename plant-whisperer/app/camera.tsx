import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

export default function CameraScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission]);

  const takePhoto = async () => {
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8, skipProcessing: true });
      if (photo?.uri) setPhotoUri(photo.uri);
    } catch (e) {
      Alert.alert('Camera error', String(e));
    }
  };

  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false, base64: false, quality: 0.9, mediaTypes: ImagePicker.MediaTypeOptions.Images
    });
    if (!res.canceled && res.assets?.[0]?.uri) setPhotoUri(res.assets[0].uri);
  };

  const identifyNow = () => {
    if (!photoUri) return Alert.alert('No image', 'Please take or select a photo first.');
    router.push({ pathname: '/result', params: { uri: photoUri } });
  };

  const goManual = () => router.push('/manual');

  if (!permission) return <View style={styles.center}><Text>Requesting camera permission…</Text></View>;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ textAlign: 'center' }}>
          We need your permission to use the camera.
        </Text>
        <TouchableOpacity onPress={requestPermission} style={styles.btn}><Text style={styles.btnText}>Grant</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <View style={styles.controls}>
        <TouchableOpacity onPress={pickFromGallery} style={styles.btn}><Text style={styles.btnText}>Pick</Text></TouchableOpacity>
        <TouchableOpacity onPress={takePhoto} style={[styles.btn, styles.capture]}><Text style={styles.btnText}>Capture</Text></TouchableOpacity>
        <TouchableOpacity onPress={identifyNow} style={styles.btn}><Text style={styles.btnText}>Identify</Text></TouchableOpacity>
        <TouchableOpacity onPress={goManual} style={styles.btnAlt}><Text style={styles.btnTextAlt}>Choose Manually</Text></TouchableOpacity>
      </View>

      {photoUri && (
        <View style={styles.preview}>
          <Image source={{ uri: photoUri }} style={{ width: 120, height: 120, borderRadius: 12 }} />
          <TouchableOpacity onPress={identifyNow} style={[styles.btn, { marginLeft: 12 }]}><Text style={styles.btnText}>Identify</Text></TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1b13' },
  camera: { flex: 1 },
  controls: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  btn: { backgroundColor: '#2f7d32', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  btnText: { color: 'white', fontWeight: '600' },
  capture: { backgroundColor: '#388e3c' },
  btnAlt: { borderWidth: 1, borderColor: 'white', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  btnTextAlt: { color: 'white' },
  preview: {
    position: 'absolute', right: 16, bottom: 92, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 12
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }
});

