import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ActivityIndicator, StyleSheet,
  SafeAreaView, ScrollView, TouchableOpacity, Animated, Share,
} from 'react-native';
import api from '../api/client';
import { useVersion } from '../context/VersionContext';

export default function ResultsScreen({ route, navigation }) {
  const { pollId } = route.params;
  const { versionConfig, primaryColor, isDarkMode } = useVersion();
  const isEnhanced = !!versionConfig.features?.results_chart;

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const animatedValues = useRef({});

  function loadResults() {
    api.get(`/api/polls/${pollId}/results`)
      .then(({ data }) => {
        setResults(data);
        setLastUpdated(new Date());
        if (isEnhanced && data.counts) {
          data.counts.forEach((item) => {
            if (!animatedValues.current[item.option_id]) {
              animatedValues.current[item.option_id] = new Animated.Value(0);
            }
          });
          const total = data.counts.reduce((s, c) => s + c.vote_count, 0);
          Animated.parallel(
            data.counts.map((item) =>
              Animated.timing(animatedValues.current[item.option_id], {
                toValue: total > 0 ? item.vote_count / total : 0,
                duration: 800,
                useNativeDriver: false,
              })
            )
          ).start();
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadResults();
    if (isEnhanced) {
      const interval = setInterval(loadResults, 10000);
      return () => clearInterval(interval);
    }
  }, [pollId, isEnhanced]);

  if (loading) {
    return <View style={[styles.centered, { backgroundColor: isDarkMode ? '#0d0d1a' : '#f5f5f5' }]}><ActivityIndicator size="large" color={primaryColor} /></View>;
  }

  const counts = results?.counts || [];
  const total = counts.reduce((sum, c) => sum + (c.vote_count || 0), 0);
  const winner = counts[0];

  const bgColor = isDarkMode ? '#0d0d1a' : '#f5f5f5';
  const titleColor = isDarkMode ? '#f8f9fa' : '#1a1a2e';
  const textColor = isDarkMode ? '#e9ecef' : '#343a40';
  const mutedColor = isDarkMode ? '#adb5bd' : '#6c757d';
  const cardColor = isDarkMode ? '#18182a' : '#fff';
  const borderColor = isDarkMode ? '#2a2a40' : '#e9ecef';

  // ─── BASIC MODE (v1.0.0, no flag) ────────────────────────────────────────
  if (!isEnhanced) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.title, { color: titleColor }]}>Results</Text>
          {results?.fromCache && <Text style={styles.cacheBadge}>Served from cache</Text>}

          {counts.map((item) => {
            const pct = total > 0 ? Math.round((item.vote_count / total) * 100) : 0;
            return (
              <View key={item.option_id} style={styles.resultRow}>
                <View style={styles.labelRow}>
                  <Text style={[styles.optionText, { color: textColor }]}>{item.text}</Text>
                  <Text style={[styles.pctText, { color: titleColor }]}>{pct}%</Text>
                </View>
                <View style={[styles.barTrack, { backgroundColor: borderColor }]}>
                  <View style={[styles.barFill, { width: `${pct}%` }]} />
                </View>
                <Text style={[styles.voteCount, { color: mutedColor }]}>{item.vote_count} vote{item.vote_count !== 1 ? 's' : ''}</Text>
              </View>
            );
          })}

          <Text style={[styles.total, { color: mutedColor }]}>Total votes: {total}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.backBtnText}>Back to Polls</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── ENHANCED MODE (v1.5.0+, flag: enhanced_results) ─────────────────────
  const secondsAgo = lastUpdated
    ? Math.floor((new Date() - lastUpdated) / 1000)
    : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.enhancedHeader}>
          <Text style={[styles.title, { color: titleColor }]}>Results</Text>
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: cardColor }]}>
              <Text style={[styles.statNum, { color: titleColor }]}>{total}</Text>
              <Text style={[styles.statLbl, { color: mutedColor }]}>Total votes</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: cardColor }]}>
              <Text style={[styles.statNum, { color: titleColor }]}>{counts.length}</Text>
              <Text style={[styles.statLbl, { color: mutedColor }]}>Options</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: cardColor }]}>
              <Text style={[styles.statNum, { color: titleColor }]}>{secondsAgo !== null ? `${secondsAgo}s` : '—'}</Text>
              <Text style={[styles.statLbl, { color: mutedColor }]}>Last update</Text>
            </View>
          </View>
          <View style={styles.enhancedBadge}>
            <Text style={styles.enhancedBadgeText}>✨ Enhanced Results (v1.5.0+)</Text>
          </View>
          {results?.fromCache && <Text style={styles.cacheBadge}>Served from cache</Text>}
        </View>

        {counts.map((item, index) => {
          const pct = total > 0 ? Math.round((item.vote_count / total) * 100) : 0;
          const isWinner = index === 0 && total > 0;
          const anim = animatedValues.current[item.option_id] || new Animated.Value(pct / 100);

          return (
            <View
              key={item.option_id}
              style={[
                styles.enhancedRow,
                { backgroundColor: cardColor },
                isWinner && styles.enhancedRowWinner,
                isWinner && isDarkMode && { backgroundColor: '#251827' },
              ]}
            >
              <View style={styles.labelRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  {isWinner && <Text style={styles.trophyIcon}>🏆 </Text>}
                  <Text style={[styles.optionText, { color: textColor }, isWinner && styles.optionTextWinner]}>
                    {item.text}
                  </Text>
                </View>
                <Text style={[styles.pctText, { color: titleColor }, isWinner && styles.pctTextWinner]}>{pct}%</Text>
              </View>

              <View style={[styles.barTrack, { backgroundColor: borderColor }]}>
                <Animated.View
                  style={[
                    styles.barFill,
                    isWinner && styles.barFillWinner,
                    {
                      width: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
              <Text style={[styles.voteCount, { color: mutedColor }]}>
                {item.vote_count} vote{item.vote_count !== 1 ? 's' : ''}
              </Text>
            </View>
          );
        })}

        <Text style={[styles.total, { color: mutedColor }]}>Total votes: {total}</Text>
        <Text style={[styles.autoRefreshNote, { color: mutedColor }]}>🔄 Auto-refreshes every 10 seconds</Text>

        <TouchableOpacity
          style={styles.shareBtn}
          onPress={() => Share.share({ message: `Poll results: ${winner?.text} is winning with ${total} votes!` })}
        >
          <Text style={styles.shareBtnText}>Share Results 📤</Text>
        </TouchableOpacity>

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
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },

  cacheBadge: { fontSize: 11, color: '#fff', backgroundColor: '#7209b7', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginBottom: 16, fontWeight: '600' },

  resultRow: { marginBottom: 18 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  optionText: { fontSize: 15, fontWeight: '500', color: '#343a40', flex: 1 },
  pctText: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  barTrack: { height: 10, backgroundColor: '#e9ecef', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: 10, backgroundColor: '#e94560', borderRadius: 5 },
  voteCount: { fontSize: 12, color: '#6c757d', marginTop: 4 },
  total: { fontSize: 14, color: '#495057', marginTop: 8, marginBottom: 16 },
  backBtn: { backgroundColor: '#1a1a2e', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  enhancedHeader: { marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginVertical: 12 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  statNum: { fontSize: 22, fontWeight: '800', color: '#1a1a2e' },
  statLbl: { fontSize: 11, color: '#6c757d', marginTop: 2 },
  enhancedBadge: { backgroundColor: '#fff3cd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 8 },
  enhancedBadgeText: { fontSize: 12, color: '#856404', fontWeight: '600' },

  enhancedRow: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  enhancedRowWinner: { borderWidth: 2, borderColor: '#e94560', backgroundColor: '#fff8f9' },
  optionTextWinner: { fontWeight: '700', color: '#e94560' },
  pctTextWinner: { color: '#e94560' },
  barFillWinner: { backgroundColor: '#e94560' },
  trophyIcon: { fontSize: 16 },

  autoRefreshNote: { fontSize: 12, color: '#adb5bd', textAlign: 'center', marginBottom: 16 },
  shareBtn: { backgroundColor: '#4361ee', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 10 },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
