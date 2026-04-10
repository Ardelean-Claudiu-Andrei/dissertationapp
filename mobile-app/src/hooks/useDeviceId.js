import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

const STORAGE_KEY = 'device_id';

// Persists a UUID across app sessions.
// Returns null until the value is loaded from AsyncStorage.
export function useDeviceId() {
  const [deviceId, setDeviceId] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) {
        setDeviceId(stored);
        return;
      }
      const newId = uuid.v4();
      AsyncStorage.setItem(STORAGE_KEY, newId);
      setDeviceId(newId);
    });
  }, []);

  return deviceId;
}
