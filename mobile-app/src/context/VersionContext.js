import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFlags } from './FlagsContext';
import APP_FEATURES from '../config/features';

const DEFAULT_CONFIG = {
  version: 'V1',
  label: 'Stable',
  theme: 'blue',
  features: {
    results_chart: false,
    dark_mode: false,
    show_vote_count: true,
  },
};

const THEME_COLORS = {
  blue:   '#1a1a2e',
  green:  '#2d6a4f',
  purple: '#7209b7',
};

const VERSION_BY_LABEL = {
  Stable: 'V1',
  Beta: 'V2',
  Canary: 'V3',
};

const VersionContext = createContext({
  versionConfig: DEFAULT_CONFIG,
  primaryColor: THEME_COLORS.blue,
  isDarkMode: false,
  setDarkModeEnabled: () => {},
  updateVersionConfig: () => {},
});

export function VersionProvider({ children }) {
  const { hasFlag } = useFlags();
  const [versionConfig, setVersionConfig] = useState(DEFAULT_CONFIG);
  const [darkModeEnabled, setDarkModeEnabledState] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('auth_user'),
      AsyncStorage.getItem('dark_mode_enabled'),
    ]).then(([raw, storedDarkMode]) => {
      setDarkModeEnabledState(storedDarkMode === 'true');
      if (!raw) return;
      try {
        const user = JSON.parse(raw);
        if (user?.version_config) setVersionConfig(normalizeVersionConfig(user.version_config));
      } catch (_) {}
    });
  }, []);

  function updateVersionConfig(config) {
    if (config) setVersionConfig(normalizeVersionConfig(config));
  }

  function setDarkModeEnabled(enabled) {
    setDarkModeEnabledState(enabled);
    AsyncStorage.setItem('dark_mode_enabled', enabled ? 'true' : 'false');
  }

  const primaryColor = THEME_COLORS[versionConfig.theme] || THEME_COLORS.blue;
  const effectiveFeatures = getEffectiveFeatures(versionConfig.features, hasFlag);
  const effectiveVersionConfig = { ...versionConfig, features: effectiveFeatures };
  const isDarkMode = !!effectiveFeatures.dark_mode && darkModeEnabled;

  return (
    <VersionContext.Provider value={{ versionConfig: effectiveVersionConfig, primaryColor, isDarkMode, setDarkModeEnabled, updateVersionConfig }}>
      {children}
    </VersionContext.Provider>
  );
}

function normalizeVersionConfig(config) {
  return {
    ...config,
    version: config.version || VERSION_BY_LABEL[config.label] || DEFAULT_CONFIG.version,
  };
}

function getEffectiveFeatures(features = {}, hasFlag) {
  const darkModeFlagEnabled =
    hasFlag(APP_FEATURES.DARK_MODE_ON_CANARY) ||
    hasFlag(APP_FEATURES.DARK_MODE);

  return {
    ...features,
    results_chart: !!features.results_chart && hasFlag(APP_FEATURES.ENHANCED_RESULTS),
    dark_mode: !!features.dark_mode && darkModeFlagEnabled,
    show_debug_info: hasFlag(APP_FEATURES.SHOW_DEBUG_INFO),
    maintenance_mode: hasFlag(APP_FEATURES.MAINTENANCE_MODE),
    compact_poll_cards: hasFlag(APP_FEATURES.COMPACT_POLL_CARDS),
    show_poll_descriptions: hasFlag(APP_FEATURES.SHOW_POLL_DESCRIPTIONS),
    left_handed_usage: hasFlag(APP_FEATURES.LEFT_HANDED_USAGE),
    quick_results_button: hasFlag(APP_FEATURES.QUICK_RESULTS_BUTTON),
    welcome_banner: hasFlag(APP_FEATURES.WELCOME_BANNER),
    profile_completion_prompt: hasFlag(APP_FEATURES.PROFILE_COMPLETION_PROMPT),
  };
}

export function useVersion() {
  return useContext(VersionContext);
}

export { THEME_COLORS };
