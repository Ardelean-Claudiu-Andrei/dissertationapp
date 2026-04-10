import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { APP_VERSION } from '../api/client';

export default function VersionGateScreen({ route }) {
  const minVersion = route.params?.minVersion || '?.?.?';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>App Update Required</Text>
        <Text style={styles.body}>
          Your app version ({APP_VERSION}) is no longer supported.{'\n'}
          Please update to version {minVersion} or later to continue.
        </Text>
        <Text style={styles.hint}>Update available on the App Store / Google Play.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  icon: { fontSize: 48, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 12 },
  body: { fontSize: 15, color: '#a0aec0', textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  hint: { fontSize: 13, color: '#6c757d', textAlign: 'center' },
});
