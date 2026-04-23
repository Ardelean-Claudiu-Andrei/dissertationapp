import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEV_API_HOST, APP_VERSION } from '../config';

export { APP_VERSION };

const BASE_URL = __DEV__
  ? `http://${DEV_API_HOST}:3001`
  : 'https://your-production-api.example.com';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const [deviceId, token, versionOverride] = await Promise.all([
    AsyncStorage.getItem('device_id'),
    AsyncStorage.getItem('auth_token'),
    AsyncStorage.getItem('app_version_override'),
  ]);
  if (deviceId) config.headers['x-device-id'] = deviceId;
  config.headers['x-app-version'] = versionOverride || APP_VERSION;
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

export default api;
