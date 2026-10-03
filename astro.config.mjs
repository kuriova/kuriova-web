// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://kuriova.com',
  // Matches vercel.json: cleanUrls + no trailing slash, so /science is served from science.html.
  trailingSlash: 'never',
  build: {
    format: 'file',
    // The CSS is small; inlining it saves a render-blocking request on mobile.
    inlineStylesheets: 'always',
  },
  vite: {
    build: {
      // Never inline scripts or fonts as data: URIs. The CSP in vercel.json allows only
      // same-origin scripts and fonts, so everything must ship as a file.
      assetsInlineLimit: 0,
    },
  },
  devToolbar: { enabled: false },
});
