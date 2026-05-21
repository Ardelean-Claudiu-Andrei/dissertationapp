import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/client';
import { APP_VERSION, AVAILABLE_VERSIONS } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { useFlags } from '../../context/FlagsContext';
import { useVersion } from '../../context/VersionContext';

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const { updateFlags } = useFlags();
  const { updateVersionConfig } = useVersion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [simulatedVersion, setSimulatedVersion] = useState(APP_VERSION);

  useEffect(() => {
    if (!__DEV__) return;
    AsyncStorage.getItem('app_version_override').then((v) => {
      if (v) setSimulatedVersion(v);
    });
  }, []);

  async function handleVersionSimulate(version) {
    setSimulatedVersion(version);
    if (version === APP_VERSION) {
      await AsyncStorage.removeItem('app_version_override');
    } else {
      await AsyncStorage.setItem('app_version_override', version);
    }
  }

  async function handleLogin() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      const deviceId = await AsyncStorage.getItem('device_id');
      const { data } = await api.post('/api/auth/login', {
        email: email.trim().toLowerCase(),
        password,
        device_id: deviceId,
      });
      if (data.flags) updateFlags(data.flags);
      if (data.user?.version_config) updateVersionConfig(data.user.version_config);
      await signIn(data.token, data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your connection.');
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
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#adb5bd"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#adb5bd"
              secureTextEntry
              textContentType="oneTimeCode"
            />

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Sign In</Text>
              }
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>Create one</Text>
            </TouchableOpacity>
          </View>
          {/* {__DEV__ && (
            <View style={styles.devPanel}>
              <Text style={styles.devLabel}>DEV · Simulate app build</Text>
              <View style={styles.devVersionRow}>
                {AVAILABLE_VERSIONS.map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.devVersionBtn, simulatedVersion === v && styles.devVersionBtnActive]}
                    onPress={() => handleVersionSimulate(v)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.devVersionText, simulatedVersion === v && styles.devVersionTextActive]}>
                      {v}{v === APP_VERSION ? ' (real)' : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.devHint}>x-app-version trimis: {simulatedVersion}</Text>
            </View>
          )} */}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 24, flexGrow: 1, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: '#e94560', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  logoText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  title: { fontSize: 26, fontWeight: '700', color: '#1a1a2e', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6c757d' },
  errorBox: { backgroundColor: '#fff0f0', borderRadius: 10, padding: 12, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#dc3545' },
  errorText: { color: '#dc3545', fontSize: 14 },
  form: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  label: { fontSize: 13, fontWeight: '600', color: '#495057', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1.5, borderColor: '#dee2e6', borderRadius: 10,
    padding: 13, fontSize: 15, color: '#1a1a2e', backgroundColor: '#fafafa',
  },
  btn: {
    backgroundColor: '#e94560', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 20,
    shadowColor: '#e94560', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnDisabled: { backgroundColor: '#adb5bd', shadowOpacity: 0 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: '#6c757d', fontSize: 14 },
  footerLink: { color: '#e94560', fontWeight: '700', fontSize: 14 },
  devPanel: {
    marginTop: 24, backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#e94560',
  },
  devLabel: { color: '#e94560', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },
  devVersionRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  devVersionBtn: {
    flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  devVersionBtnActive: { backgroundColor: '#e94560', borderColor: '#e94560' },
  devVersionText: { color: '#a0aec0', fontSize: 12, fontWeight: '600' },
  devVersionTextActive: { color: '#fff' },
  devHint: { color: '#6c757d', fontSize: 11, textAlign: 'center' },
});
