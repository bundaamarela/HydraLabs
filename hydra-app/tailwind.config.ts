import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface:   '#0C0B09',
        surface2:  '#161410',
        surface3:  '#1E1C18',
        border:    '#2A2824',
        cream:     '#F4EFE3',
        cream2:    '#EAE4D6',
        ink:       '#1A1714',
        ink2:      '#3A3530',
        muted:     '#8A8480',
        faint:     '#4A463F',
        ok:        '#7A8A6A',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'Helvetica Neue',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'SF Mono',
          'Menlo',
          'monospace',
        ],
      },
      borderWidth: { hairline: '0.5px' },
      borderRadius: {
        panel: '12px',
        input: '14px',
        pill:  '20px',
        btn:   '8px',
        card:  '10px',
      },
    },
  },
  plugins: [],
};

export default config;
