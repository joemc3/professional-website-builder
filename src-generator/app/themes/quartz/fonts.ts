import { Inter } from 'next/font/google';

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

// Quartz uses Inter for both heading and body
export const interBody = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});
