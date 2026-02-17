import { defineConfig } from 'astro/config';
import icon from 'astro-icon';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://ersn.net',
  trailingSlash: 'never',
  integrations: [icon(), mdx(), sitemap(), react()],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['sharp'],
    },
  },
  redirects: {},
});
