import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';

const statusColors = { active: '#28a745', closed: '#dc3545', draft: '#6c757d' };

export default function ActivityScreen({ navigation }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await api.get('/api/users/me/votes');
      setHistory(data);
      setError(null);
    } catch (err) {
      setError('Could not load activity. Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadHistory();
    }, [loadHistory])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadHistory();
  }, [loadHistory]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.header}>My Activity</Text>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1a1a2e" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.header}>My Activity</Text>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); loadHistory(); }}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (history.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.header}>My Activity</Text>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🗳️</Text>
          <Text style={styles.emptyTitle}>No votes yet</Text>
          <Text style={styles.emptySubtitle}>Your voting history will appear here after you vote on a poll.</Text>
          <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate('PollsTab')}>
            <Text style={styles.ctaText}>Browse Polls</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a1a2e" />}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Text style={styles.header}>My Activity</Text>
            <Text style={styles.subheader}>{history.length} vote{history.length !== 1 ? 's' : ''} cast</Text>
          </View>
        }
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('PollsTab', { screen: 'Results', params: { pollId: item.poll_id } })}
            activeOpacity={0.75}
          >
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.poll_title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: (statusColors[item.poll_status] || '#6c757d') + '22' }]}>
                <Text style={[styles.statusBadgeText, { color: statusColors[item.poll_status] || '#6c757d' }]}>
                  {item.poll_status}
                </Text>
              </View>
            </View>
            <View style={styles.choiceRow}>
              <Text style={styles.choiceLabel}>Your vote: </Text>
              <Text style={styles.choiceValue}>{item.option_text}</Text>
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.cardDate}>{item.created_at?.slice(0, 16).replace('T', ' ')}</Text>
              <Text style={styles.cardLink}>See results →</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  headerWrap: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  header: { fontSize: 28, fontWeight: '700', color: '#1a1a2e' },
  subheader: { fontSize: 13, color: '#6c757d', marginTop: 2 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6c757d', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  cta: { backgroundColor: '#e94560', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  errorText: { color: '#dc3545', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#1a1a2e', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  retryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', flex: 1, marginRight: 8, lineHeight: 20 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  choiceRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 8, padding: 10, marginBottom: 10 },
  choiceLabel: { fontSize: 13, color: '#6c757d' },
  choiceValue: { fontSize: 13, fontWeight: '700', color: '#1a1a2e', flex: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDate: { fontSize: 12, color: '#adb5bd' },
  cardLink: { fontSize: 12, color: '#4361ee', fontWeight: '600' },
});
