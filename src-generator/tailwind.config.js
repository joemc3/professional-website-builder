/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        onyx: {
          950: '#0a0a0a',
          900: '#121212',
          800: '#1a1a1a',
          700: '#2a2a2a',
          600: '#3a3a3a',
        },
        quartz: {
          950: '#FAFAFA',
          900: '#FFFFFF',
          800: '#F5F5F5',
          700: '#E5E7EB',
          600: '#D1D5DB',
        },
        serene: {
          950: '#F0F4F8',
          900: '#FFFDF7',
          800: '#E6EDF3',
          700: '#CBD5E0',
          600: '#A0AEC0',
        },
        jade: {
          950: '#F7F6F3',
          900: '#FFFEF5',
          800: '#EDECE7',
          700: '#D4D9CE',
          600: '#B8BFB0',
        },
        coral: {
          950: '#FFFBF7',
          900: '#FFFFFF',
          800: '#FFF5F0',
          700: '#FFE5E5',
          600: '#FFD1D1',
        },
        accent: {
          blue: '#60a5fa',
          teal: '#5eead4',
          purple: '#8B5CF6',
          'teal-serene': '#319795',
          olive: '#6B8E23',
          'coral-red': '#FF6B6B',
        },
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          '"SF Mono"',
          'Menlo',
          'Consolas',
          '"Liberation Mono"',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
}
