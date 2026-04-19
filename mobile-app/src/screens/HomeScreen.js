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
  const [votedPollIds, setVotedPollIds] = useState(new Set());

  const register = useCallback(async () => {
    if (!deviceId) return;
    try {
      const { data } = await api.post('/api/users/register', { device_id: deviceId });

      await AsyncStorage.setItem('user_id', data.user.id);
      if (data.user.cohort) await AsyncStorage.setItem('user_cohort', data.user.cohort);

      const hasVersionGate = data.flags?.some((f) => f.name === 'version_gate');
      if (hasVersionGate) {
        navigation.getParent()?.getParent()?.replace('VersionGate', { minVersion: '2.0.0' });
        return;
      }

      loadPolls();
    } catch {
      setError('Registration failed. Please check your connection.');
      setLoading(false);
    }
  }, [deviceId]);

  const loadPolls = useCallback(async () => {
    try {
      const [{ data }, voteHistoryRaw] = await Promise.all([
        api.get('/api/polls'),
        AsyncStorage.getItem('vote_history'),
      ]);
      setPolls(data);
      const history = voteHistoryRaw ? JSON.parse(voteHistoryRaw) : [];
      setVotedPollIds(new Set(history.map((h) => h.pollId)));
    } catch {
      setError('Failed to load polls.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a1a2e" />}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Text style={styles.header}>Active Polls</Text>
            <Text style={styles.subheader}>{polls.length} poll{polls.length !== 1 ? 's' : ''} available</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No active polls at the moment.</Text>
            <Text style={styles.emptySubtext}>Check back later!</Text>
          </View>
        }
        renderItem={({ item }) => {
          const voted = votedPollIds.has(item.id);
          return (
            <TouchableOpacity
              style={styles.pollCard}
              onPress={() => navigation.navigate('Poll', { pollId: item.id, title: item.title })}
              activeOpacity={0.75}
            >
              <View style={styles.pollCardTop}>
                <Text style={styles.pollTitle}>{item.title}</Text>
                {voted && (
                  <View style={styles.votedPill}>
                    <Text style={styles.votedPillText}>✓ Voted</Text>
                  </View>
                )}
              </View>
              {item.description ? <Text style={styles.pollDesc}>{item.description}</Text> : null}
              <Text style={voted ? styles.pollResultsArrow : styles.pollArrow}>
                {voted ? 'See results →' : 'Vote now →'}
              </Text>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerWrap: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  header: { fontSize: 28, fontWeight: '700', color: '#1a1a2e' },
  subheader: { fontSize: 13, color: '#6c757d', marginTop: 2 },
  list: { paddingBottom: 100 },
  pollCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  pollCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  pollTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', flex: 1, marginRight: 8 },
  votedPill: { backgroundColor: '#d4edda', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  votedPillText: { fontSize: 11, fontWeight: '700', color: '#28a745' },
  pollDesc: { fontSize: 13, color: '#6c757d', marginBottom: 10, lineHeight: 18 },
  pollArrow: { fontSize: 13, color: '#e94560', fontWeight: '600' },
  pollResultsArrow: { fontSize: 13, color: '#4361ee', fontWeight: '600' },
  errorText: { color: '#dc3545', fontSize: 15, textAlign: 'center', padding: 20 },
  emptyWrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 17, fontWeight: '600', color: '#343a40', marginBottom: 6 },
  emptySubtext: { fontSize: 14, color: '#6c757d' },
});
