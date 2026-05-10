/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: '#0A1628',
        secondary: '#C9A44A',
        tertiary: '#F7F2E8',
        navy: {
          dark: '#060F1C',
          light: '#1E3050',
        }
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'serif'],
        body: ['Raleway', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
