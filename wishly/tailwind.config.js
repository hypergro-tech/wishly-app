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
        cream: '#FFF5EB', // main canvas: warm cream, same as the iPhone app
        ivory: '#FFFAF5', // text on deep teal
        lilac: '#E6D6FF', // reflective, intimate
        butter: '#FFE07A', // joyful, optimistic
        mint: '#BDF2D5', // quiet, reassuring
      },
      borderRadius: { card: '18px' },
    },
  },
  plugins: [],
}
