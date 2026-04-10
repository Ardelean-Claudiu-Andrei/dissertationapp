import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';
import { useDeviceId } from '../hooks/useDeviceId';

export default function HomeScreen({ navigation }) {
  const deviceId = useDeviceId();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const register = useCallback(async () => {
    if (!deviceId) return;
    try {
      const { data } = await api.post('/api/users/register', { device_id: deviceId });

      // Persist the server-assigned user UUID for use when voting
      await AsyncStorage.setItem('user_id', data.user.id);

      // Check for version_gate flag — navigate to gate screen if present
      const hasVersionGate = data.flags?.some((f) => f.name === 'version_gate');
      if (hasVersionGate) {
        navigation.replace('VersionGate', { minVersion: '2.0.0' });
        return;
      }

      loadPolls();
    } catch (err) {
      setError('Registration failed. Please check your connection.');
      setLoading(false);
    }
  }, [deviceId]);

  const loadPolls = useCallback(async () => {
    try {
      const { data } = await api.get('/api/polls');
      setPolls(data);
    } catch {
      setError('Failed to load polls.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Wait for deviceId before registering
  useEffect(() => {
    if (deviceId) register();
  }, [deviceId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPolls();
  }, [loadPolls]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a1a2e" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={polls}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={<Text style={styles.header}>Active Polls</Text>}
        ListEmptyComponent={<Text style={styles.empty}>No active polls at the moment.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.pollCard}
            onPress={() => navigation.navigate('Poll', { pollId: item.id, title: item.title })}
          >
            <Text style={styles.pollTitle}>{item.title}</Text>
            {item.description ? <Text style={styles.pollDesc}>{item.description}</Text> : null}
            <Text style={styles.pollArrow}>Vote →</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 22, fontWeight: '700', color: '#1a1a2e', marginBottom: 16, paddingHorizontal: 16, paddingTop: 16 },
  list: { paddingBottom: 24 },
  pollCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  pollTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a2e', marginBottom: 4 },
  pollDesc: { fontSize: 13, color: '#6c757d', marginBottom: 8 },
  pollArrow: { fontSize: 13, color: '#e94560', fontWeight: '600' },
  errorText: { color: '#dc3545', fontSize: 15 },
  empty: { textAlign: 'center', color: '#6c757d', marginTop: 40 },
});
