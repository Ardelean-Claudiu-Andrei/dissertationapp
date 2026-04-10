import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Android emulator routes localhost to 10.0.2.2
// iOS simulator uses localhost
// Physical device: replace with your machine's LAN IP
const BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3001'
    : 'http://localhost:3001';

// App version — in a real app read from app.json or react-native-version
export const APP_VERSION = '1.0.0';

const api = axios.create({ baseURL: BASE_URL });

// Inject device_id and app_version on every request
api.interceptors.request.use(async (config) => {
  const deviceId = await AsyncStorage.getItem('device_id');
  if (deviceId) config.headers['x-device-id'] = deviceId;
  config.headers['x-app-version'] = APP_VERSION;
  return config;
});

export default api;
