/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      // Styles for 'prose' classes.
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            a: {
              textDecoration: 'none',
              fontWeight: '400',
            },
            p: {
              marginLeft: '3px',
              textAlign: 'justify',
              fontWeight: '300',
            },
            h2: {
              marginLeft: '3px',
              fontWeight: '600',
            },
            h3: {
              marginLeft: '3px',
              fontWeight: '600',
            },
            li: {
              fontWeight: '300',
            },
            hr: {
              borderColor: 'var(--tw-prose-bullets)',
            },
          },
        },
      }),
      colors: {},
    },
  },
  plugins: [require('@tailwindcss/typography'), require('@tailwindcss/forms')],
};
