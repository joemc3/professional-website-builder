import { loadPortfolioData } from './lib/loadPortfolioData';

import { jetbrainsMono, inter as onyxInter } from './themes/onyx/fonts';
import OnyxPortfolio from './themes/onyx/portfolio';
import OnyxTargeted from './themes/onyx/targeted';

import { poppins, dmSans } from './themes/coral/fonts';
import CoralPortfolio from './themes/coral/portfolio';
import CoralTargeted from './themes/coral/targeted';

import { sourceSerif, sourceSans } from './themes/serene/fonts';
import SerenePortfolio from './themes/serene/portfolio';
import SereneTargeted from './themes/serene/targeted';

import { libreBaskerville, nunitoSans } from './themes/jade/fonts';
import JadePortfolio from './themes/jade/portfolio';
import JadeTargeted from './themes/jade/targeted';

import { inter as quartzInter, interBody as quartzInterBody } from './themes/quartz/fonts';
import QuartzPortfolio from './themes/quartz/portfolio';
import QuartzTargeted from './themes/quartz/targeted';

export default function Home() {
  const data = loadPortfolioData();
  const themeName = data.theme.name.toLowerCase();
  const isTargeted = data.siteType === 'targeted';

  switch (themeName) {
    case 'coral': {
      const fontClasses = `${poppins.variable} ${dmSans.variable}`;
      return <div className={fontClasses}>{isTargeted ? <CoralTargeted data={data} /> : <CoralPortfolio data={data} />}</div>;
    }
    case 'serene': {
      const fontClasses = `${sourceSerif.variable} ${sourceSans.variable}`;
      return <div className={fontClasses}>{isTargeted ? <SereneTargeted data={data} /> : <SerenePortfolio data={data} />}</div>;
    }
    case 'jade': {
      const fontClasses = `${libreBaskerville.variable} ${nunitoSans.variable}`;
      return <div className={fontClasses}>{isTargeted ? <JadeTargeted data={data} /> : <JadePortfolio data={data} />}</div>;
    }
    case 'quartz': {
      const fontClasses = `${quartzInter.variable} ${quartzInterBody.variable}`;
      return <div className={fontClasses}>{isTargeted ? <QuartzTargeted data={data} /> : <QuartzPortfolio data={data} />}</div>;
    }
    case 'onyx':
    default: {
      const fontClasses = `${jetbrainsMono.variable} ${onyxInter.variable}`;
      return <div className={fontClasses}>{isTargeted ? <OnyxTargeted data={data} /> : <OnyxPortfolio data={data} />}</div>;
    }
  }
}
