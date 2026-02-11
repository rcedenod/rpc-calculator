export default {
  darkMode: 'class',
  content: ['./index.html', './app.js'],
  theme: {
    extend: {
      colors: {
        primary: '#8b0a2a',
        'background-dark': '#000000',
        'surface-dark': '#0a0a0a',
        'border-dark': '#222222',
        'border-input': '#333333',
        'focus-crimson': '#6f0a22',
        'surface-hover': '#2a0f16',
      },
      fontFamily: {
        display: [
          'Cascadia Code'
        ],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(139, 10, 42, 0.45)',
      },
    },
  },
};
