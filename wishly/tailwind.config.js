/** @type {import('tailwindcss').Config} */
// Tokens from the Wishly Creative Brandbook (proposed identity, Oct 2026).
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Arial Bold: practical voice. Georgia Italic: emotional accent.
        sans: ['Arial', '"Helvetica Neue"', 'Helvetica', 'sans-serif'],
        accent: ['Georgia', '"Times New Roman"', 'serif'],
      },
      colors: {
        ink: '#143438', // deep teal: text, anchor
        coral: { DEFAULT: '#FF6B7A', hover: '#F7586A' }, // signature, celebration
        berry: '#A3364A', // labels and white-text actions (coral can't carry small white type)
        ivory: '#FFFAF5', // main canvas
        lilac: '#F2E8FF', // reflective, intimate
        butter: '#FFF2C7', // joyful, optimistic
        mint: '#E1FAED', // quiet, reassuring
      },
      borderRadius: { card: '18px' },
    },
  },
  plugins: [],
}
