const AVAILABLE_FEATURES = [
  {
    key: 'dark_mode_on_canary',
    label: 'Dark Mode on Canary',
    description: 'Allow V3 Canary users to enable the dark-mode switch.',
    min_version: '2.0.0',
  },
  {
    key: 'enhanced_results',
    label: 'Enhanced Results',
    description: 'Animated results screen with stats and auto-refresh.',
    min_version: '1.5.0',
  },
  {
    key: 'show_debug_info',
    label: 'Debug Info',
    description: 'Show cohort, version badge, app version, user ID, and device ID.',
    min_version: '1.0.0',
  },
  {
    key: 'maintenance_mode',
    label: 'Maintenance Banner',
    description: 'Show a maintenance banner on the Home screen.',
    min_version: '1.0.0',
  },
  {
    key: 'version_gate',
    label: 'Version Gate',
    description: 'Block users below the minimum app version.',
    min_version: '2.0.0',
  },
  {
    key: 'compact_poll_cards',
    label: 'Compact Poll Cards',
    description: 'Use a denser poll list layout with smaller cards.',
    min_version: '1.0.0',
  },
  {
    key: 'show_poll_descriptions',
    label: 'Poll Descriptions',
    description: 'Show poll descriptions in the poll list.',
    min_version: '1.0.0',
  },
  {
    key: 'left_handed_usage',
    label: 'Left-Handed Usage',
    description: 'Reverse the bottom navigation order for left-handed use.',
    min_version: '1.5.0',
  },
  {
    key: 'quick_results_button',
    label: 'Quick Results',
    description: 'Let users jump straight to results from polls they already voted on.',
    min_version: '1.5.0',
  },
  {
    key: 'welcome_banner',
    label: 'Welcome Banner',
    description: 'Show a research/demo welcome banner on the Home screen.',
    min_version: '1.0.0',
  },
  {
    key: 'profile_completion_prompt',
    label: 'Profile Completion Prompt',
    description: 'Prompt users to complete missing profile fields.',
    min_version: '1.0.0',
  },
  {
    key: 'vertical_navbar',
    label: 'Vertical Navbar (vertical_navbar)',
    description: 'Replace the bottom pill tab bar with a vertical tab bar anchored to the bottom-right corner.',
    min_version: '1.0.0',
  },
];

function normalizeFeatureKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function findFeature(keyOrName) {
  const normalized = normalizeFeatureKey(keyOrName);
  return AVAILABLE_FEATURES.find((feature) => feature.key === normalized);
}

module.exports = { AVAILABLE_FEATURES, findFeature, normalizeFeatureKey };
