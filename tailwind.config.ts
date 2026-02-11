import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './*.tsx',
    './components/**/*.{ts,tsx}',
    './layouts/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
