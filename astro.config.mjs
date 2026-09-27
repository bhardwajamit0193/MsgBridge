import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [tailwind()],
  vite: {
    server: {
      watch: {
        ignored: ['**/data/**', '**/sessions/**'],
      },
    },
  },
  server: {
    port: 4321,
    host: true,
  },
});
