export const brand = {
  name: 'SAMVIT Labs',
  logo: '/brand/logo.svg',
  mark: '/brand/logo-mark.svg',
};
export const offerings = [
  {
    id: 'ai-agents',
    short: 'Custom AI agents',
    href: '/capabilities/ai-agents/',
    shape: 1,
    sceneLabel: 'REQUEST → CONTEXT → ACTION',
    note: 'A workflow shaped around you.',
  },
  {
    id: 'chatbots',
    short: 'Chatbots',
    href: '/capabilities/chatbots/',
    shape: 2,
    sceneLabel: 'QUESTION → UNDERSTANDING → ANSWER',
    note: 'Good conversations start with understanding.',
  },
  {
    id: 'voice-bots',
    short: 'Voicebots',
    href: '/capabilities/voice-bots/',
    shape: 3,
    sceneLabel: 'LISTEN → UNDERSTAND → RESPOND',
    note: 'A voice that makes room for yours.',
  },
  {
    id: 'text-to-speech',
    short: 'Text to speech',
    href: '/capabilities/text-to-speech/',
    shape: 4,
    sceneLabel: 'TEXT → EXPRESSION → VOICE',
    note: 'Written words. A spoken dimension.',
  },
  {
    id: 'speech-to-text',
    short: 'Speech to text',
    href: '/capabilities/speech-to-text/',
    shape: 5,
    sceneLabel: 'SOUND → WORDS → POSSIBILITIES',
    note: 'The beginning of a clearer picture.',
  },
] as const;
export const capabilities = offerings.map(({ short: name, href }) => ({
  name,
  href,
}));
