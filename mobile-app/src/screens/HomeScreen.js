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
import { useFlags } from '../context/FlagsContext';
import { useVersion } from '../context/VersionContext';
import VersionSwitcher from '../components/VersionSwitcher';

export default function HomeScreen({ navigation }) {
  const deviceId = useDeviceId();
  const { updateFlags, refreshFlags } = useFlags();
  const { versionConfig, primaryColor, isDarkMode } = useVersion();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [votedPollIds, setVotedPollIds] = useState(new Set());
  const [tapCount, setTapCount] = useState(0);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const bgColor = isDarkMode ? '#0d0d1a' : '#f5f5f5';
  const cardColor = isDarkMode ? '#18182a' : '#fff';
  const titleColor = isDarkMode ? '#f8f9fa' : '#1a1a2e';
  const textColor = isDarkMode ? '#e9ecef' : '#343a40';
  const mutedColor = isDarkMode ? '#adb5bd' : '#6c757d';
  const showDebugInfo = !!versionConfig.features?.show_debug_info;
  const showMaintenance = !!versionConfig.features?.maintenance_mode;
  const compactPollCards = !!versionConfig.features?.compact_poll_cards;
  const showPollDescriptions = !!versionConfig.features?.show_poll_descriptions;
  const quickResultsButton = !!versionConfig.features?.quick_results_button;
  const showWelcomeBanner = !!versionConfig.features?.welcome_banner;

  const register = useCallback(async () => {
    if (!deviceId) return;
    try {
      const { data } = await api.post('/api/users/register', { device_id: deviceId });

      await AsyncStorage.setItem('user_id', data.user.id);
      if (data.user.cohort) await AsyncStorage.setItem('user_cohort', data.user.cohort);

      updateFlags(data.flags);

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
      const [{ data }, voteHistoryRaw, userId] = await Promise.all([
        api.get('/api/polls'),
        AsyncStorage.getItem('vote_history'),
        AsyncStorage.getItem('user_id'),
      ]);
      if (userId) refreshFlags(userId).catch(() => {});
      setPolls(data);
      const history = voteHistoryRaw ? JSON.parse(voteHistoryRaw) : [];
      setVotedPollIds(new Set(history.map((h) => h.pollId)));
    } catch {
      setError('Failed to load polls.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshFlags]);

  useEffect(() => {
    if (deviceId) register();
  }, [deviceId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPolls();
  }, [loadPolls]);

  function handleTitleTap() {
    const next = tapCount + 1;
    setTapCount(next);
    if (next >= 5) {
      setTapCount(0);
      setShowSwitcher(true);
    }
  }

  async function handleVersionChange() {
    setLoading(true);
    register();
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: bgColor }]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <FlatList
        data={polls}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            {showDebugInfo && (
              <View style={[styles.versionBanner, { backgroundColor: primaryColor }]}>
                <Text style={styles.versionBannerText}>
                  {versionConfig.version} — {versionConfig.label}
                </Text>
              </View>
            )}
            {showMaintenance && (
              <View style={[styles.maintenanceBanner, { backgroundColor: isDarkMode ? '#332712' : '#fff3cd' }]}>
                <Text style={[styles.maintenanceText, { color: isDarkMode ? '#ffd166' : '#856404' }]}>
                  Maintenance mode is enabled
                </Text>
              </View>
            )}
            {showWelcomeBanner && (
              <View style={[styles.welcomeBanner, { backgroundColor: isDarkMode ? '#14251e' : '#e7f5ee', borderColor: isDarkMode ? '#2d6a4f' : '#b7e4c7' }]}>
                <Text style={[styles.welcomeTitle, { color: isDarkMode ? '#b7e4c7' : '#2d6a4f' }]}>Research mode</Text>
                <Text style={[styles.welcomeText, { color: isDarkMode ? '#d8f3dc' : '#3f6f55' }]}>
                  You are seeing experimental app features assigned to your cohort.
                </Text>
              </View>
            )}
            <TouchableOpacity onPress={handleTitleTap} activeOpacity={1}>
              <Text style={[styles.header, { color: titleColor }]}>Active Polls</Text>
            </TouchableOpacity>
            <Text style={[styles.subheader, { color: mutedColor }]}>{polls.length} poll{polls.length !== 1 ? 's' : ''} available</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={[styles.emptyText, { color: textColor }]}>No active polls at the moment.</Text>
            <Text style={[styles.emptySubtext, { color: mutedColor }]}>Check back later!</Text>
          </View>
        }
        renderItem={({ item }) => {
          const voted = votedPollIds.has(item.id);
          return (
            <TouchableOpacity
              style={[
                styles.pollCard,
                compactPollCards && styles.pollCardCompact,
                { backgroundColor: cardColor, shadowOpacity: isDarkMode ? 0 : 0.07 },
              ]}
              onPress={() => {
                if (voted && quickResultsButton) {
                  navigation.navigate('Results', { pollId: item.id });
                  return;
                }
                navigation.navigate('Poll', { pollId: item.id, title: item.title });
              }}
              activeOpacity={0.75}
            >
              <View style={styles.pollCardTop}>
                <Text style={[styles.pollTitle, compactPollCards && styles.pollTitleCompact, { color: titleColor }]}>{item.title}</Text>
                {voted && (
                  <View style={styles.votedPill}>
                    <Text style={styles.votedPillText}>✓ Voted</Text>
                  </View>
                )}
              </View>
              {showPollDescriptions && item.description ? <Text style={[styles.pollDesc, compactPollCards && styles.pollDescCompact, { color: mutedColor }]}>{item.description}</Text> : null}
              <Text style={voted ? styles.pollResultsArrow : styles.pollArrow}>
                {voted && quickResultsButton ? 'Open results →' : voted ? 'See results →' : 'Vote now →'}
              </Text>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.list}
      />
      <VersionSwitcher
        visible={showSwitcher}
        onClose={() => setShowSwitcher(false)}
        onVersionChange={handleVersionChange}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerWrap: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  versionBanner: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
  versionBannerText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  maintenanceBanner: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 10 },
  maintenanceText: { fontSize: 13, fontWeight: '700' },
  welcomeBanner: { borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1 },
  welcomeTitle: { fontSize: 13, fontWeight: '800', marginBottom: 3 },
  welcomeText: { fontSize: 12, lineHeight: 17 },
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
  pollCardCompact: {
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
  },
  pollCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  pollTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', flex: 1, marginRight: 8 },
  pollTitleCompact: { fontSize: 14 },
  votedPill: { backgroundColor: '#d4edda', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  votedPillText: { fontSize: 11, fontWeight: '700', color: '#28a745' },
  pollDesc: { fontSize: 13, color: '#6c757d', marginBottom: 10, lineHeight: 18 },
  pollDescCompact: { fontSize: 12, marginBottom: 6, lineHeight: 16 },
  pollArrow: { fontSize: 13, color: '#e94560', fontWeight: '600' },
  pollResultsArrow: { fontSize: 13, color: '#4361ee', fontWeight: '600' },
  errorText: { color: '#dc3545', fontSize: 15, textAlign: 'center', padding: 20 },
  emptyWrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 17, fontWeight: '600', color: '#343a40', marginBottom: 6 },
  emptySubtext: { fontSize: 14, color: '#6c757d' },
});
