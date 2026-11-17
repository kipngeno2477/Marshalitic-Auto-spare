/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mashalitic: {
          navy: '#071B38',
          'navy-dark': '#040F20',
          'navy-light': '#0D274D',
          blue: '#1264D8',
          'blue-light': '#3B82F6',
          orange: '#FF7900',
          'orange-hover': '#E66D00',
          'orange-light': '#FFF3E8',
          success: '#10B981',
          danger: '#EF4444',
          warning: '#F59E0B',
          bg: '#F3F6FC',
          card: '#FFFFFF',
          text: '#10213D',
          muted: '#64748B',
          border: '#E2E8F0'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 10px rgba(7, 27, 56, 0.05)',
        'card-hover': '0 8px 24px rgba(7, 27, 56, 0.1)',
        'pos': '0 4px 20px rgba(255, 121, 0, 0.15)',
      }
    },
  },
  plugins: [],
}
