import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import icon from 'astro-icon';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://ersn.net',
  trailingSlash: 'never',
  integrations: [tailwind({ config: { applyBaseStyles: false } }), icon(), mdx(), sitemap()],
  vite: {
    optimizeDeps: {
      exclude: ['sharp'],
    },
  },
  redirects: {},
});
