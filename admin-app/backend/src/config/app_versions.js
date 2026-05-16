const APP_VERSIONS = {
  '1.0.0': {
    label: 'Stable',
    theme: 'blue',
    features: {
      results_chart: false,
      dark_mode: false,
      show_vote_count: true,
    },
  },
  '2.0.0': {
    label: 'Beta',
    theme: 'green',
    features: {
      results_chart: true,
      dark_mode: false,
      show_vote_count: true,
    },
  },
  '3.0.0': {
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
