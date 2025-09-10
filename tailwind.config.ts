import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f7f7f8',
          100: '#efeff1',
          200: '#d9d9df',
          300: '#b9bac9',
          400: '#8e90ab',
          500: '#6b6d8f',
          600: '#54567a',
          700: '#444563',
          800: '#3a3a50',
          900: '#353545'
        }
      }
    }
  },
  plugins: []
}

export default config

