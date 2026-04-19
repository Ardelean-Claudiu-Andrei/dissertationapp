import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Emulator: 10.0.2.2 (Android) / localhost (iOS) points to host machine.
// Physical device: use your Mac's LAN IP (e.g. 192.168.1.x).
const DEV_HOST = '192.168.1.14'; // Mac's LAN IP
const BASE_URL = __DEV__
  ? `http://${DEV_HOST}:3001`
  : 'https://your-production-api.example.com';

export const APP_VERSION = '1.0.0';

const api = axios.create({ baseURL: BASE_URL });

// Inject device_id, app_version, and JWT token on every request
api.interceptors.request.use(async (config) => {
  const [deviceId, token] = await Promise.all([
    AsyncStorage.getItem('device_id'),
    AsyncStorage.getItem('auth_token'),
  ]);
  if (deviceId) config.headers['x-device-id'] = deviceId;
  config.headers['x-app-version'] = APP_VERSION;
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

export default api;
