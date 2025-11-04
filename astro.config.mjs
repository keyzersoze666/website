import { defineConfig } from 'astro/config';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { existsSync } from 'node:fs';
import { siteConfiguration } from './src/config/site.ts';
// Deployment variables take precedence; local files remain ignored by Git.
for (const file of ['.env.local', '.env'])
  if (existsSync(file)) process.loadEnvFile(file);
const deployment = siteConfiguration();
export default defineConfig({
  site: deployment.url,
  output: 'static',
  redirects: {
    '/draft-02.html': '/',
    '/concepts/voice-to-action.html': '/',
    '/models/': '/research-development/proprietary-models/',
    '/model-development/': '/research-development/proprietary-models/',
    '/solutions/ai-agents/': '/capabilities/ai-agents/',
    '/products/chatbots/': '/capabilities/chatbots/',
    '/products/voice-bots/': '/capabilities/voice-bots/',
    '/products/text-to-speech/': '/capabilities/text-to-speech/',
    '/products/speech-to-text/': '/capabilities/speech-to-text/',
    '/contact-sales/': '/contact/',
    '/blog/designing-ai-around-your-workflow/':
      '/blog/measuring-agentic-ai-roi/',
  },
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [[rehypeKatex, { trust: false }]],
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } },
  },
  trailingSlash: 'always',
  vite: { build: { assetsInlineLimit: 4096 } },
});
