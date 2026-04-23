import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_VERSION, AVAILABLE_VERSIONS } from '../config';

export default function VersionSwitcher({ visible, onClose, onVersionChange }) {
  const [selected, setSelected] = useState(APP_VERSION);

  React.useEffect(() => {
    if (visible) {
      AsyncStorage.getItem('app_version_override').then((v) => setSelected(v || APP_VERSION));
    }
  }, [visible]);

  async function apply(version) {
    await AsyncStorage.setItem('app_version_override', version);
    setSelected(version);
    onVersionChange(version);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>🔧 Dev: Switch Version</Text>
          <Text style={styles.subtitle}>Simulate a different app version{'\n'}(for dissertation demo only)</Text>

          {AVAILABLE_VERSIONS.map((v) => (
            <TouchableOpacity
              key={v}
              style={[styles.versionBtn, selected === v && styles.versionBtnActive]}
              onPress={() => apply(v)}
            >
              <Text style={[styles.versionText, selected === v && styles.versionTextActive]}>
                {selected === v ? '● ' : '○ '}v{v}
                {v === '1.0.0' && '  — Basic UI'}
                {v === '1.5.0' && '  — Enhanced Results'}
                {v === '2.0.0' && '  — Version Gate demo'}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  modal: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%' },
  title: { fontSize: 18, fontWeight: '700', color: '#1a1a2e', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#6c757d', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  versionBtn: { borderWidth: 2, borderColor: '#e9ecef', borderRadius: 12, padding: 14, marginBottom: 10 },
  versionBtnActive: { borderColor: '#e94560', backgroundColor: '#fff5f7' },
  versionText: { fontSize: 14, color: '#495057', fontWeight: '500' },
  versionTextActive: { color: '#e94560', fontWeight: '700' },
  closeBtn: { marginTop: 8, padding: 12, alignItems: 'center' },
  closeBtnText: { color: '#6c757d', fontWeight: '600' },
});
