/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#006a6a',
          container: '#00a3a3',
          fixed: '#7df5f5',
          'fixed-dim': '#5dd9d8',
          on: '#ffffff',
          'on-container': '#003131',
        },
        secondary: {
          DEFAULT: '#545f73',
          container: '#d5e0f8',
          'fixed-dim': '#bcc7de',
          on: '#ffffff',
        },
        tertiary: {
          DEFAULT: '#00687a',
          container: '#00a0bb',
          on: '#ffffff',
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
          on: '#ffffff',
        },
        surface: {
          DEFAULT: '#f8f9ff',
          bright: '#f8f9ff',
          dim: '#cbdbf5',
          variant: '#d3e4fe',
          lowest: '#ffffff',
          low: '#eff4ff',
          container: '#e5eeff',
          high: '#dce9ff',
          highest: '#d3e4fe',
          'on-variant': '#3d4949',
        },
        outline: {
          DEFAULT: '#6d7a79',
          variant: '#bcc9c8',
        },
        'on-surface': '#0b1c30',
        background: '#f8f9ff',
        'on-background': '#0b1c30',
      },
      fontFamily: {
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.05)',
        md: '0 4px 12px rgba(0,0,0,.1), 0 2px 4px rgba(0,0,0,.06)',
        lg: '0 10px 30px rgba(0,0,0,.12), 0 4px 8px rgba(0,0,0,.06)',
        xl: '0 20px 50px rgba(0,0,0,.15)',
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '12px',
        lg: '16px',
      }
    },
  },
  plugins: [],
}
