/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        mono:  ['var(--font-mono)', 'monospace'],
      },
      colors: {
        navy:   { DEFAULT: '#0D1B2A', 2: '#152232', 3: '#1E3048' },
        gold:   { DEFAULT: '#C9A84C', 2: '#E8C472', 3: '#F5DFA0' },
        slate:  { DEFAULT: '#4A6080', 2: '#6B85A0', 3: '#8FA5BE' },
        cream:  { DEFAULT: '#F7F3EE', 2: '#EDE8E0', 3: '#DDD6CA' },
        green2: '#5EC89A',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
