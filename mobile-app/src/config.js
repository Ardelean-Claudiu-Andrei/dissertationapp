// ─── API Configuration ───────────────────────────────────────────────────────
// iOS Simulator: 'localhost' works out of the box.
// Physical device: change to your Mac's LAN IP (e.g. '192.168.1.x').
// Run `ipconfig getifaddr en0` in Terminal to find your IP.
export const DEV_API_HOST = 'localhost';

// App metadata
export const APP_VERSION = '1.0.0';

// Dev-only: version options for the hidden version switcher (tap title 5x)
export const AVAILABLE_VERSIONS = ['1.0.0', '1.5.0', '2.0.0'];
