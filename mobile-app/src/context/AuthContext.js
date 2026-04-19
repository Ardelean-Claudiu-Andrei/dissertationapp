import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        // Ensure device_id exists before any screen renders
        const existing = await AsyncStorage.getItem('device_id');
        if (!existing) {
          await AsyncStorage.setItem('device_id', uuid.v4());
        }

        // Restore auth session
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem('auth_token'),
          AsyncStorage.getItem('auth_user'),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (_) {
        // never block the app from loading
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  async function signIn(token, user) {
    await Promise.all([
      AsyncStorage.setItem('auth_token', token),
      AsyncStorage.setItem('auth_user', JSON.stringify(user)),
      AsyncStorage.setItem('user_id', user.id),
      AsyncStorage.setItem('user_cohort', user.cohort || ''),
    ]);
    setToken(token);
    setUser(user);
  }

  async function signOut() {
    // Keep device_id — it's needed immediately on the Register screen
    await AsyncStorage.multiRemove(['auth_token', 'auth_user', 'user_id', 'user_cohort', 'vote_history']);
    setToken(null);
    setUser(null);
  }

  function updateUser(updated) {
    setUser(updated);
    AsyncStorage.setItem('auth_user', JSON.stringify(updated));
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
