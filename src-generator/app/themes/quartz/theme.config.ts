import type { ThemeConfig } from '../../types/theme-config';

const config: ThemeConfig = {
  slug: 'quartz',
  name: 'Quartz',
  description: 'Light, crisp, corporate',
  audience: 'Business and finance professionals',
  fonts: {
    heading: 'Inter',
    body: 'Inter',
  },
  colors: {
    primary: '#3355cc',
    accent: '#5577ee',
    background: '#ffffff',
    surface: '#f8f9fb',
    text: '#1a1a2e',
  },
  supports: {
    portfolio: true,
    targeted: true,
  },
};

export default config;
