import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import api from '../api/client';

export default function ResultsScreen({ route, navigation }) {
  const { pollId } = route.params;
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/polls/${pollId}/results`)
      .then(({ data }) => setResults(data))
      .finally(() => setLoading(false));
  }, [pollId]);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#1a1a2e" /></View>;
  }

  const counts = results?.counts || [];
  const total = counts.reduce((sum, c) => sum + (c.vote_count || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Results</Text>
        {results?.fromCache && (
          <Text style={styles.cacheBadge}>Served from cache</Text>
        )}

        {counts.map((item) => {
          const pct = total > 0 ? Math.round((item.vote_count / total) * 100) : 0;
          return (
            <View key={item.option_id} style={styles.resultRow}>
              <View style={styles.labelRow}>
                <Text style={styles.optionText}>{item.text}</Text>
                <Text style={styles.pctText}>{pct}%</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.voteCount}>{item.vote_count} vote{item.vote_count !== 1 ? 's' : ''}</Text>
            </View>
          );
        })}

        <Text style={styles.total}>Total votes: {total}</Text>

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backBtnText}>Back to Polls</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  cacheBadge: {
    fontSize: 11,
    color: '#fff',
    backgroundColor: '#7209b7',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 16,
    fontWeight: '600',
  },
  resultRow: { marginBottom: 18 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  optionText: { fontSize: 15, fontWeight: '500', color: '#343a40', flex: 1 },
  pctText: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  barTrack: { height: 10, backgroundColor: '#e9ecef', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: 10, backgroundColor: '#e94560', borderRadius: 5 },
  voteCount: { fontSize: 12, color: '#6c757d', marginTop: 4 },
  total: { fontSize: 14, color: '#495057', marginTop: 8, marginBottom: 24 },
  backBtn: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
