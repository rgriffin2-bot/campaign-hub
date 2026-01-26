/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './app/client/**/*.{js,ts,jsx,tsx}',
    './app/client/index.html',
  ],
  theme: {
    extend: {
      colors: {
        // Dark blue theme colors
        background: 'hsl(222, 47%, 8%)',
        foreground: 'hsl(213, 31%, 91%)',
        card: {
          DEFAULT: 'hsl(222, 47%, 11%)',
          foreground: 'hsl(213, 31%, 91%)',
        },
        popover: {
          DEFAULT: 'hsl(222, 47%, 11%)',
          foreground: 'hsl(213, 31%, 91%)',
        },
        primary: {
          DEFAULT: 'hsl(217, 91%, 60%)',
          foreground: 'hsl(222, 47%, 8%)',
        },
        secondary: {
          DEFAULT: 'hsl(217, 33%, 17%)',
          foreground: 'hsl(213, 31%, 91%)',
        },
        muted: {
          DEFAULT: 'hsl(217, 33%, 17%)',
          foreground: 'hsl(215, 20%, 65%)',
        },
        accent: {
          DEFAULT: 'hsl(217, 33%, 22%)',
          foreground: 'hsl(213, 31%, 91%)',
        },
        destructive: {
          DEFAULT: 'hsl(0, 62%, 50%)',
          foreground: 'hsl(213, 31%, 91%)',
        },
        border: 'hsl(217, 33%, 17%)',
        input: 'hsl(217, 33%, 17%)',
        ring: 'hsl(217, 91%, 60%)',
        sidebar: {
          DEFAULT: 'hsl(222, 47%, 7%)',
          foreground: 'hsl(213, 31%, 91%)',
          border: 'hsl(217, 33%, 17%)',
          accent: 'hsl(217, 33%, 15%)',
          'accent-foreground': 'hsl(213, 31%, 91%)',
        },
      },
      borderRadius: {
        lg: '0.5rem',
        md: 'calc(0.5rem - 2px)',
        sm: 'calc(0.5rem - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
