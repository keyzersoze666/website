import { offerings } from './site';
import { legalDetails } from './legal';

export const publicPagePaths = [
  '/',
  '/about/',
  '/solutions/',
  '/blog/',
  ...offerings.map((offer) => offer.href),
  '/research-development/proprietary-models/',
  '/research-development/workflow-designer/',
];

export const capabilitySeoTitles: Record<string, string> = {
  'ai-agents': 'Custom AI Agent Development — SAMVIT Labs',
  chatbots: 'Custom AI Chatbot Development — SAMVIT Labs',
  'voice-bots': 'Voice AI & Voicebot Development — SAMVIT Labs',
  'text-to-speech': 'Custom Text-to-Speech Solutions — SAMVIT Labs',
  'speech-to-text': 'Speech-to-Text Integration for Business — SAMVIT Labs',
};

export function siteIdentity(site: URL) {
  return [
    {
      '@type': 'Organization',
      '@id': new URL('#organization', site).href,
      name: legalDetails.tradingName,
      legalName: legalDetails.legalEntityName,
      url: site.href,
      description:
        'Custom AI systems built around business information, conversations and workflows.',
      logo: {
        '@type': 'ImageObject',
        url: new URL('/brand/logo-search.svg', site).href,
        width: 640,
        height: 640,
      },
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Bengaluru',
        addressRegion: 'Karnataka',
        addressCountry: 'IN',
      },
    },
    {
      '@type': 'WebSite',
      '@id': new URL('#website', site).href,
      name: legalDetails.tradingName,
      url: site.href,
      inLanguage: 'en',
      publisher: { '@id': new URL('#organization', site).href },
    },
  ];
}

export function pageBreadcrumbs(path: string, title: string, site: URL) {
  if (path === '/') return [];
  const items = [{ name: 'Home', item: site.href }];
  if (path.startsWith('/blog/') && path !== '/blog/')
    items.push({ name: 'Journal', item: new URL('/blog/', site).href });
  items.push({
    name: title.split(' — ')[0].split(' | ')[0],
    item: new URL(path, site).href,
  });
  return [
    {
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        ...item,
      })),
    },
  ];
}
