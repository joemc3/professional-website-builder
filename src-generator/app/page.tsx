import { loadPortfolioData } from './lib/loadPortfolioData';
import OnyxTheme from './themes/onyx/page';

export default function Home() {
  const data = loadPortfolioData();

  // Route to the appropriate theme based on data.theme.name
  // Currently only Onyx is implemented
  const themeName = data.theme.name.toLowerCase();

  switch (themeName) {
    case 'onyx':
      return <OnyxTheme />;
    default:
      // Default to Onyx theme if theme not found
      return <OnyxTheme />;
  }
}
