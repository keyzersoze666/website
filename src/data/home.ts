import { offerings } from './site';

export const homeProblems = [
  {
    title: 'The same questions keep reaching your team.',
    situation:
      'Customers need answers, updates and help finding the next step.',
    direction:
      'Connect approved knowledge, useful conversations and a clear route to a person.',
    href: '/solutions/#customer-support',
    link: 'Explore customer support',
  },
  {
    title: 'Documents move faster than the checking can.',
    situation:
      'People compare files, chase missing details and re-enter information across systems.',
    direction:
      'Structure the information, check the right records and route exceptions for review.',
    href: '/solutions/#document-processing',
    link: 'Explore document workflows',
  },
  {
    title: 'The answer exists. Finding it takes time.',
    situation:
      'Your team works across manuals, policies and scattered business knowledge.',
    direction:
      'Make relevant information easier to find, with supporting sources and access boundaries.',
    href: '/solutions/#employee-assistance',
    link: 'Explore knowledge assistance',
  },
] as const;

const capabilityCopy = {
  'ai-agents': {
    purpose: 'Carry a task across the steps it needs.',
    copy: 'Connect business information, permitted actions and review points in a workflow built for your systems.',
    example:
      'Check an invoice against order records and route a difference to the right person.',
  },
  chatbots: {
    purpose: 'Help people find a supported answer.',
    copy: 'Bring approved knowledge into a conversation, with sources to inspect and a handoff when the answer needs a person.',
    example:
      'Answer a service question using the relevant guide, then collect the details needed for follow-up.',
  },
  'voice-bots': {
    purpose: 'Make a spoken conversation useful.',
    copy: 'Gather details, handle corrections and connect the conversation to the next step in your process.',
    example:
      'Take a service request, confirm an uncertain date and hand the context to your team.',
  },
  'text-to-speech': {
    purpose: 'Give the response a clear voice.',
    copy: 'Turn approved text into speech suited to the audience, terminology and application.',
    example:
      'Read a service update aloud with the right pronunciation for names, dates and identifiers.',
  },
  'speech-to-text': {
    purpose: 'Bring spoken information into the workflow.',
    copy: 'Turn audio into text that people can review, search and use in the records that matter.',
    example:
      'Prepare a field-note transcript and review uncertain terms before it becomes part of a record.',
  },
} as const;

export const homeCapabilities = offerings.map((offer) => ({
  id: offer.id,
  name: offer.short,
  linkLabel:
    offer.id === 'ai-agents'
      ? 'Explore custom AI agents'
      : `Explore ${offer.short.toLowerCase()}`,
  href: offer.href,
  shape: offer.shape,
  sceneLabel: offer.sceneLabel,
  note: offer.note,
  ...capabilityCopy[offer.id],
}));

export const homeWorkflow = [
  ['A customer asks', 'A question arrives by voice or chat.'],
  [
    'Context comes together',
    'Approved knowledge and relevant records inform the response.',
  ],
  [
    'The next step is checked',
    'Permissions and review points determine what can happen.',
  ],
  [
    'The conversation moves on',
    'A clear answer or an informed handoff follows.',
  ],
] as const;

export const homeCommitments = [
  [
    'Your data stays yours.',
    'Project access does not transfer ownership of client information.',
  ],
  [
    'Access has a purpose.',
    'Staff access to client data is restricted to the engagement and task.',
  ],
  [
    'Client data is not training data.',
    'We do not use it to train or fine-tune our own or third-party models.',
  ],
  [
    'Decisions stay accountable.',
    'Permitted actions, human review and evaluation criteria are agreed for the work.',
  ],
] as const;
