/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        spotify: {
          green: '#1DB954',
          greenDark: '#1aa34a',
          black: '#191414',
          dark: '#121212',
          darker: '#0a0a0a',
          card: '#181818',
          cardHover: '#282828',
          gray: '#b3b3b3',
          lightgray: '#727272',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'green-glow':
          'radial-gradient(circle at 50% 0%, rgba(29,185,84,0.18), transparent 60%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
      },
    },
  },
  plugins: [],
};
