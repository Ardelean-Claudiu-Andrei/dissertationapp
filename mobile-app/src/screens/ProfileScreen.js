import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, SafeAreaView,
  ScrollView, TouchableOpacity, Alert, ActivityIndicator,
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useFlags } from '../context/FlagsContext';
import { useVersion } from '../context/VersionContext';
import { APP_VERSION } from '../api/client';

const cohortColors = { cohort_a: '#4361ee', cohort_b: '#7209b7', cohort_c: '#f72585' };

export default function ProfileScreen() {
  const { user: cachedUser, signOut, updateUser } = useAuth();
  const { refreshFlags } = useFlags();
  const { versionConfig, primaryColor, isDarkMode, setDarkModeEnabled, updateVersionConfig } = useVersion();
  const [profile, setProfile] = useState(null);
  const [voteCount, setVoteCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [error, setError] = useState(null);
  const [pwError, setPwError] = useState(null);

  useFocusEffect(
    useCallback(() => {
      setError(null);
      // Fetch fresh profile from server
      api.get('/api/users/me')
        .then(({ data }) => {
          setProfile(data);
          updateUser(data);
          if (data.version_config) updateVersionConfig(data.version_config);
          refreshFlags(data.id).catch(() => {});
        })
        .catch(() => {
          if (cachedUser) setProfile(cachedUser);
        });

      AsyncStorage.getItem('vote_history').then((raw) => {
        setVoteCount(raw ? JSON.parse(raw).length : 0);
      });
    }, [])
  );

  function startEdit() {
    setEditForm({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      country: profile?.country || '',
    });
    setEditing(true);
    setError(null);
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
  }

  async function saveProfile() {
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.put('/api/users/me', {
        first_name: editForm.first_name.trim() || null,
        last_name: editForm.last_name.trim() || null,
        country: editForm.country.trim() || null,
      });
      setProfile(data);
      updateUser(data);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function savePassword() {
    setPwError(null);
    if (!pwForm.current_password || !pwForm.new_password) {
      setPwError('All password fields are required.');
      return;
    }
    if (pwForm.new_password.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    if (pwForm.new_password !== pwForm.confirm) {
      setPwError('New passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await api.put('/api/users/me', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setPwForm({ current_password: '', new_password: '', confirm: '' });
      setChangingPassword(false);
      Alert.alert('Success', 'Password updated.');
    } catch (err) {
      setPwError(err.response?.data?.error || 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  }

  function confirmLogout() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  }

  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email || 'User'
    : '—';

  const initials = profile
    ? (profile.first_name?.[0] || profile.email?.[0] || '?').toUpperCase() +
      (profile.last_name?.[0] || '').toUpperCase()
    : '?';

  const cohort = profile?.cohort || '—';
  const cohortColor = cohortColors[cohort] || primaryColor;
  const supportsDarkMode = !!versionConfig.features?.dark_mode;
  const showDebugInfo = !!versionConfig.features?.show_debug_info;
  const showCompletionPrompt = !!versionConfig.features?.profile_completion_prompt;
  const hasMissingProfileInfo = !profile?.first_name || !profile?.last_name || !profile?.country;
  const palette = getPalette(isDarkMode);

  if (!profile) {
    return <View style={[styles.centered, { backgroundColor: palette.background }]}><ActivityIndicator size="large" color={primaryColor} /></View>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.pageTitle, { color: palette.title }]}>Profile</Text>

        {showCompletionPrompt && hasMissingProfileInfo && (
          <TouchableOpacity
            style={[styles.completionPrompt, { backgroundColor: isDarkMode ? '#241d14' : '#fff8e1', borderColor: isDarkMode ? '#856404' : '#ffe08a' }]}
            onPress={startEdit}
            activeOpacity={0.8}
          >
            <Text style={[styles.completionTitle, { color: isDarkMode ? '#ffd166' : '#856404' }]}>Complete your profile</Text>
            <Text style={[styles.completionText, { color: isDarkMode ? '#ffe8a3' : '#7a5a00' }]}>
              Add your name and country to improve the research dataset.
            </Text>
          </TouchableOpacity>
        )}

        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: cohortColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={[styles.displayName, { color: palette.title }]}>{displayName}</Text>
          <Text style={[styles.emailLabel, { color: palette.muted }]}>{profile.email}</Text>
          <View style={[styles.cohortBadge, { backgroundColor: cohortColor + '22' }]}>
            <Text style={[styles.cohortBadgeText, { color: cohortColor }]}>{cohort}</Text>
          </View>
          {showDebugInfo && (
            <View style={[styles.versionBadge, { backgroundColor: primaryColor }]}>
              <Text style={styles.versionBadgeText}>
                {versionConfig.version} — {versionConfig.label}
              </Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard value={voteCount} label="Votes cast" palette={palette} />
          <StatCard value={APP_VERSION} label="App version" palette={palette} />
          {showDebugInfo && <StatCard value={cohort} label="Cohort" palette={palette} />}
        </View>

        {supportsDarkMode && (
          <View style={[styles.section, { backgroundColor: palette.card, shadowOpacity: isDarkMode ? 0 : 0.06 }]}>
            <View style={[styles.infoRow, { borderTopWidth: 0, borderTopColor: palette.border }]}>
              <View>
                <Text style={[styles.infoLabel, { color: palette.text }]}>Dark mode</Text>
                <Text style={[styles.infoNote, { color: palette.muted }]}>V3 Canary only</Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={setDarkModeEnabled}
                trackColor={{ false: '#dee2e6', true: primaryColor + '88' }}
                thumbColor={isDarkMode ? primaryColor : '#fff'}
              />
            </View>
          </View>
        )}

        {/* Edit profile */}
        <View style={[styles.section, { backgroundColor: palette.card, shadowOpacity: isDarkMode ? 0 : 0.06 }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.muted }]}>Personal Info</Text>
            {!editing && (
              <TouchableOpacity onPress={startEdit}>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {error && <Text style={styles.inlineError}>{error}</Text>}

          {editing ? (
            <View style={styles.editForm}>
              <Field label="First name" value={editForm.first_name} onChange={(v) => setEditForm((p) => ({ ...p, first_name: v }))} palette={palette} />
              <Field label="Last name"  value={editForm.last_name}  onChange={(v) => setEditForm((p) => ({ ...p, last_name: v }))} palette={palette} />
              <Field label="Country"    value={editForm.country}    onChange={(v) => setEditForm((p) => ({ ...p, country: v }))} placeholder="e.g. RO" maxLength={10} palette={palette} />
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <InfoRow label="First name"  value={profile.first_name || '—'} palette={palette} />
              <InfoRow label="Last name"   value={profile.last_name  || '—'} palette={palette} />
              <InfoRow label="Email"       value={profile.email      || '—'} note="(not editable)" palette={palette} />
              <InfoRow label="Country"     value={profile.country    || '—'} palette={palette} />
            </>
          )}
        </View>

        {/* Change password */}
        <View style={[styles.section, { backgroundColor: palette.card, shadowOpacity: isDarkMode ? 0 : 0.06 }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.muted }]}>Security</Text>
            {!changingPassword && (
              <TouchableOpacity onPress={() => { setChangingPassword(true); setPwError(null); }}>
                <Text style={styles.editLink}>Change password</Text>
              </TouchableOpacity>
            )}
          </View>

          {changingPassword ? (
            <View style={styles.editForm}>
              {pwError && <Text style={styles.inlineError}>{pwError}</Text>}
              <Field label="Current password" value={pwForm.current_password} onChange={(v) => setPwForm((p) => ({ ...p, current_password: v }))} secure palette={palette} />
              <Field label="New password"     value={pwForm.new_password}     onChange={(v) => setPwForm((p) => ({ ...p, new_password: v }))}     secure palette={palette} />
              <Field label="Confirm new"      value={pwForm.confirm}          onChange={(v) => setPwForm((p) => ({ ...p, confirm: v }))}           secure palette={palette} />
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.saveBtn} onPress={savePassword} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Update</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setChangingPassword(false); setPwForm({ current_password: '', new_password: '', confirm: '' }); }}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <InfoRow label="Password" value="••••••••" palette={palette} />
          )}
        </View>

        {/* Device info (read-only) */}
        {showDebugInfo && (
          <View style={[styles.section, { backgroundColor: palette.card, shadowOpacity: isDarkMode ? 0 : 0.06 }]}>
            <Text style={[styles.sectionTitle, { padding: 16, paddingBottom: 8, color: palette.muted }]}>Device Info</Text>
            <InfoRow label="User ID"     value={profile.id        ? `${profile.id.slice(0, 8)}…`        : '—'} palette={palette} />
            <InfoRow label="Device ID"   value={profile.device_id ? `${profile.device_id.slice(0, 12)}…` : '—'} palette={palette} />
            <InfoRow label="App version" value={APP_VERSION} palette={palette} />
          </View>
        )}

        {/* Sign out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
          <Text style={styles.logoutBtnText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function getPalette(isDark) {
  return isDark
    ? { background: '#0d0d1a', card: '#18182a', title: '#f8f9fa', text: '#e9ecef', muted: '#adb5bd', border: '#2a2a40', input: '#111122' }
    : { background: '#f5f5f5', card: '#fff', title: '#1a1a2e', text: '#343a40', muted: '#6c757d', border: '#f0f0f0', input: '#fafafa' };
}

function StatCard({ value, label, palette }) {
  return (
    <View style={[styles.statCard, { backgroundColor: palette.card }]}>
      <Text style={[styles.statValue, { color: palette.title }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: palette.muted }]}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value, note, palette }) {
  return (
    <View style={[styles.infoRow, { borderTopColor: palette.border }]}>
      <Text style={[styles.infoLabel, { color: palette.text }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[styles.infoValue, { color: palette.muted }]}>{value}</Text>
        {note ? <Text style={[styles.infoNote, { color: palette.muted }]}> {note}</Text> : null}
      </View>
    </View>
  );
}

function Field({ label, value, onChange, placeholder, maxLength, secure, palette }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.fieldLabel, { color: palette.text }]}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, { backgroundColor: palette.input, borderColor: palette.border, color: palette.title }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder || ''}
        placeholderTextColor="#adb5bd"
        maxLength={maxLength}
        secureTextEntry={!!secure}
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingBottom: 100 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: '#1a1a2e', marginBottom: 24 },
  completionPrompt: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 18 },
  completionTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  completionText: { fontSize: 13, lineHeight: 18 },

  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  displayName: { fontSize: 20, fontWeight: '700', color: '#1a1a2e', marginBottom: 2 },
  emailLabel: { fontSize: 13, color: '#6c757d', marginBottom: 8 },
  cohortBadge: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 5 },
  cohortBadgeText: { fontWeight: '700', fontSize: 13 },
  versionBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, marginTop: 6 },
  versionBadgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#1a1a2e' },
  statLabel: { fontSize: 11, color: '#6c757d', marginTop: 2, textAlign: 'center' },

  section: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#6c757d', textTransform: 'uppercase', letterSpacing: 0.8 },
  editLink: { fontSize: 13, fontWeight: '600', color: '#e94560' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  infoLabel: { fontSize: 14, color: '#343a40', fontWeight: '500' },
  infoValue: { fontSize: 14, color: '#6c757d' },
  infoNote: { fontSize: 11, color: '#adb5bd' },

  inlineError: { color: '#dc3545', fontSize: 13, paddingHorizontal: 16, marginBottom: 4 },

  editForm: { padding: 16, paddingTop: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#495057', marginBottom: 5 },
  fieldInput: { borderWidth: 1.5, borderColor: '#dee2e6', borderRadius: 10, padding: 11, fontSize: 14, color: '#1a1a2e', backgroundColor: '#fafafa' },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  saveBtn: { flex: 1, backgroundColor: '#1a1a2e', borderRadius: 10, padding: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelBtn: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 10, padding: 12, alignItems: 'center' },
  cancelBtnText: { color: '#495057', fontWeight: '600', fontSize: 14 },

  logoutBtn: { backgroundColor: '#fff0f0', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#ffd0d0', marginTop: 4 },
  logoutBtnText: { color: '#dc3545', fontWeight: '700', fontSize: 15 },
});
