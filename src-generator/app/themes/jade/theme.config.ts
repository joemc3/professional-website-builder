import type { ThemeConfig } from '../../types/theme-config';

const config: ThemeConfig = {
  slug: 'jade',
  name: 'Jade',
  description: 'Earthy, balanced, sophisticated',
  audience: 'Academics, researchers',
  fonts: {
    heading: 'Libre Baskerville',
    body: 'Nunito Sans',
  },
  colors: {
    primary: '#3d6b4f',
    accent: '#8fb380',
    background: '#f4f7f2',
    surface: '#ffffff',
    text: '#2a3a2e',
  },
  supports: {
    portfolio: true,
    targeted: true,
  },
};

export default config;
