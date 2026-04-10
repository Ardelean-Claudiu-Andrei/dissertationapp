import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

export default function PollScreen({ route, navigation }) {
  const { pollId } = route.params;
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('user_id').then((id) => setUserId(id));
  }, []);

  const [poll, setPoll] = useState(null);
  const [options, setOptions] = useState([]);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/polls/${pollId}`)
      .then(({ data }) => {
        setPoll(data.poll);
        setOptions(data.options);
      })
      .finally(() => setLoading(false));
  }, [pollId]);

  async function handleVote() {
    if (!selectedOptionId) {
      Alert.alert('Select an option', 'Please select an option before voting.');
      return;
    }
    if (!userId) return;

    setSubmitting(true);
    try {
      await api.post(`/api/polls/${pollId}/vote`, {
        option_id: selectedOptionId,
        user_id: userId,
      });
      navigation.replace('Results', { pollId });
    } catch (err) {
      if (err.response?.status === 409) {
        Alert.alert('Already voted', 'You have already voted on this poll.', [
          { text: 'See results', onPress: () => navigation.replace('Results', { pollId }) },
        ]);
      } else {
        Alert.alert('Error', 'Failed to submit vote. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#1a1a2e" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{poll?.title}</Text>
        {poll?.description ? <Text style={styles.description}>{poll.description}</Text> : null}

        <Text style={styles.sectionLabel}>Choose an option:</Text>
        {options.map((option) => {
          const selected = selectedOptionId === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => setSelectedOptionId(option.id)}
            >
              <View style={[styles.radio, selected && styles.radioSelected]} />
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {option.text}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[styles.voteBtn, (!selectedOptionId || submitting) && styles.voteBtnDisabled]}
          onPress={handleVote}
          disabled={!selectedOptionId || submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.voteBtnText}>Submit Vote</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20 },
  title: { fontSize: 20, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  description: { fontSize: 14, color: '#6c757d', marginBottom: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#495057', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  optionSelected: { borderColor: '#1a1a2e', backgroundColor: '#f0f0f8' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#adb5bd', marginRight: 12 },
  radioSelected: { borderColor: '#1a1a2e', backgroundColor: '#1a1a2e' },
  optionText: { fontSize: 15, color: '#343a40' },
  optionTextSelected: { fontWeight: '600', color: '#1a1a2e' },
  voteBtn: {
    backgroundColor: '#e94560',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  voteBtnDisabled: { backgroundColor: '#adb5bd' },
  voteBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
