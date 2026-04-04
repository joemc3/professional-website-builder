import type { ThemeConfig } from '../../types/theme-config';

const config: ThemeConfig = {
  slug: 'coral',
  name: 'Coral',
  description: 'Warm, bold, energetic',
  audience: 'Creative professionals, designers',
  fonts: {
    heading: 'Poppins',
    body: 'DM Sans',
  },
  colors: {
    primary: '#d4553a',
    accent: '#f4a261',
    background: '#fffaf7',
    surface: '#fff5f0',
    text: '#2d2420',
  },
  supports: {
    portfolio: true,
    targeted: true,
  },
};

export default config;
