import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { signIn } = useAuth();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function set(field) {
    return (val) => setForm((prev) => ({ ...prev, [field]: val }));
  }

  async function handleRegister() {
    setError(null);
    if (!form.email.trim() || !form.password) {
      setError('Email and password are required.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const deviceId = await AsyncStorage.getItem('device_id');
      const { data } = await api.post('/api/auth/register', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        first_name: form.first_name.trim() || undefined,
        last_name: form.last_name.trim() || undefined,
        device_id: deviceId,
      });
      await signIn(data.token, data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logo}><Text style={styles.logoText}>D</Text></View>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Join the research experiment</Text>
          </View>

          {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>First name</Text>
                <TextInput style={styles.input} value={form.first_name} onChangeText={set('first_name')} placeholder="Ion" placeholderTextColor="#adb5bd" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Last name</Text>
                <TextInput style={styles.input} value={form.last_name} onChangeText={set('last_name')} placeholder="Popescu" placeholderTextColor="#adb5bd" />
              </View>
            </View>

            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={set('email')}
              placeholder="you@example.com"
              placeholderTextColor="#adb5bd"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Password * (min 6 characters)</Text>
            <TextInput style={styles.input} value={form.password} onChangeText={set('password')} placeholder="••••••••" placeholderTextColor="#adb5bd" secureTextEntry />

            <Text style={styles.label}>Confirm password *</Text>
            <TextInput style={styles.input} value={form.confirm} onChangeText={set('confirm')} placeholder="••••••••" placeholderTextColor="#adb5bd" secureTextEntry />

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Create Account</Text>
              }
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 24, flexGrow: 1, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 28 },
  logo: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#e94560', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  title: { fontSize: 26, fontWeight: '700', color: '#1a1a2e', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6c757d' },
  errorBox: { backgroundColor: '#fff0f0', borderRadius: 10, padding: 12, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#dc3545' },
  errorText: { color: '#dc3545', fontSize: 14 },
  form: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  row: { flexDirection: 'row' },
  label: { fontSize: 13, fontWeight: '600', color: '#495057', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1.5, borderColor: '#dee2e6', borderRadius: 10, padding: 13, fontSize: 15, color: '#1a1a2e', backgroundColor: '#fafafa' },
  btn: { backgroundColor: '#e94560', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20, shadowColor: '#e94560', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnDisabled: { backgroundColor: '#adb5bd', shadowOpacity: 0 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: '#6c757d', fontSize: 14 },
  footerLink: { color: '#e94560', fontWeight: '700', fontSize: 14 },
});
