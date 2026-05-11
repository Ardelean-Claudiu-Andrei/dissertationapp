import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

const FlagsContext = createContext({
  flags: [],
  hasFlag: () => false,
  updateFlags: () => {},
  refreshFlags: async () => [],
});

function normalizeFlagName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeFlags(newFlags) {
  return (newFlags || []).map((flag) => ({
    ...flag,
    normalizedName: normalizeFlagName(flag.name),
  }));
}

export function FlagsProvider({ children }) {
  const [flags, setFlags] = useState([]);

  useEffect(() => {
    AsyncStorage.getItem('feature_flags').then((raw) => {
      if (!raw) return;
      try {
        setFlags(normalizeFlags(JSON.parse(raw)));
      } catch (_) {}
    });
  }, []);

  function hasFlag(name) {
    const normalized = normalizeFlagName(name);
    return flags.some((f) => f.normalizedName === normalized || normalizeFlagName(f.name) === normalized);
  }

  function updateFlags(newFlags) {
    const nextFlags = normalizeFlags(newFlags);
    setFlags(nextFlags);
    AsyncStorage.setItem('feature_flags', JSON.stringify(nextFlags));
  }

  const refreshFlags = useCallback(async (userId) => {
    if (!userId) return [];
    const { data } = await api.get('/api/flags', { params: { user_id: userId } });
    updateFlags(data.flags || []);
    return data.flags || [];
  }, []);

  return (
    <FlagsContext.Provider value={{ flags, hasFlag, updateFlags, refreshFlags }}>
      {children}
    </FlagsContext.Provider>
  );
}

export function useFlags() {
  return useContext(FlagsContext);
}

export { normalizeFlagName };
