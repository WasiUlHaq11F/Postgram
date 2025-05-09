// tailwind.config.js (or tailwind.config.ts)
export default {
  darkMode: 'class', // Required
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      primary: '#ffffff', //  light background
      text: '#000000',     // light text color
    },
  },
  plugins: [],
};
