const APP_VERSIONS = {
  V1: {
    label: 'Stable',
    theme: 'blue',
    features: {
      results_chart: false,
      dark_mode: false,
      show_vote_count: true,
    },
  },
  V2: {
    label: 'Beta',
    theme: 'green',
    features: {
      results_chart: true,
      dark_mode: false,
      show_vote_count: true,
    },
  },
  V3: {
    label: 'Canary',
    theme: 'purple',
    features: {
      results_chart: true,
      dark_mode: true,
      show_vote_count: false,
    },
  },
};

module.exports = APP_VERSIONS;
