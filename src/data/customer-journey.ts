export const capabilityJourneys: Record<
  string,
  {
    outcomeTitle: string;
    outcomes: string[];
    solutionId: string;
    solutionLabel: string;
    connection: string;
    companion: { href: string; label: string };
  }
> = {
  'ai-agents': {
    outcomeTitle: 'A workflow with a verifiable end state.',
    outcomes: [
      'A defined route from incoming request to confirmed result, including exceptions.',
      'Connections with agreed permissions, approval points and recovery behaviour.',
      'A task evaluation and an operating plan for review, monitoring and handover.',
    ],
    solutionId: 'customer-support',
    solutionLabel: 'customer support workflow',
    connection:
      'When the request starts as a conversation, an agent can work behind a',
    companion: { href: '/capabilities/chatbots/', label: 'chatbot' },
  },
  chatbots: {
    outcomeTitle: 'An assistant your team can keep informed.',
    outcomes: [
      'A conversation built around maintained sources and the questions it should answer.',
      'A way to inspect supporting information, clarify gaps and hand over to a person.',
      'Representative question tests and a process for reviewing answers as sources change.',
    ],
    solutionId: 'employee-assistance',
    solutionLabel: 'employee knowledge workflow',
    connection:
      'When an answer needs a record check or an approved action, connect the conversation to',
    companion: { href: '/capabilities/ai-agents/', label: 'an agent workflow' },
  },
  'voice-bots': {
    outcomeTitle: 'A conversation connected to the next step.',
    outcomes: [
      'A spoken interaction for an agreed task, language and channel.',
      'Handling for corrections, important details, confirmed actions and human handoff.',
      'A call evaluation covering timing, understanding and the outcome the caller reaches.',
    ],
    solutionId: 'customer-support',
    solutionLabel: 'customer support and voice workflow',
    connection:
      'The spoken response has its own pronunciation, pacing and playback decisions. Explore',
    companion: {
      href: '/capabilities/text-to-speech/',
      label: 'text to speech',
    },
  },
  'text-to-speech': {
    outcomeTitle: 'A repeatable route from approved text to audio.',
    outcomes: [
      'A speech-preparation process that preserves the meaning of names, numbers and terms.',
      'Voice evaluation and an agreed file or streaming delivery path.',
      'Listener checks and a revision process for keeping spoken content current.',
    ],
    solutionId: 'speech-content',
    solutionLabel: 'speech and content workflow',
    connection: 'For two-way interaction, spoken output becomes one part of',
    companion: {
      href: '/capabilities/voice-bots/',
      label: 'a voicebot conversation',
    },
  },
  'speech-to-text': {
    outcomeTitle: 'A transcript that fits the work after recording.',
    outcomes: [
      'A transcription flow evaluated on representative audio and business terminology.',
      'A reviewable output with agreed timing, speaker labels and treatment of uncertainty.',
      'Checks for critical fields, correction effort and the destination that uses the transcript.',
    ],
    solutionId: 'field-operations',
    solutionLabel: 'field documentation workflow',
    connection:
      'Turning a checked transcript into a proposed report or system update can add',
    companion: { href: '/capabilities/ai-agents/', label: 'an agent workflow' },
  },
};

interface ArticleJourney {
  articles: string[];
  title: string;
  copy: string;
  href: string;
  label: string;
  topicId: string;
}

const articleJourneys: ArticleJourney[] = [
  {
    articles: [
      'support-agents-that-resolve-requests',
      'evaluating-agents-beyond-the-demo',
      'when-multi-agent-systems-help',
      'measuring-agentic-ai-roi',
      'production-ai-monitoring-and-rollback',
    ],
    title: 'Which step in your workflow needs to work better?',
    copy: 'Explore how requests, business rules, review and confirmed outcomes can fit together in a scoped client project.',
    href: '/solutions/#customer-support',
    label: 'Explore support workflows',
    topicId: 'ai-agents',
  },
  {
    articles: ['agentic-invoice-to-erp-workflow'],
    title: 'Have a document process with too much manual checking?',
    copy: 'Start with the fields your team needs, the records they check and the exceptions that need a decision.',
    href: '/solutions/#document-processing',
    label: 'Explore document workflows',
    topicId: 'document-processing',
  },
  {
    articles: ['agentic-sales-operations-crm'],
    title: 'Where does a sales enquiry lose momentum?',
    copy: 'Explore a workflow that prepares the account context, questions and proposed follow-up for your team to review.',
    href: '/solutions/#sales-operations',
    label: 'Explore sales workflows',
    topicId: 'sales-operations',
  },
  {
    articles: ['real-time-voice-agent-design'],
    title: 'What should a caller be able to accomplish?',
    copy: 'See how listening, corrections, business context and handoff can become one purposeful voice interaction.',
    href: '/capabilities/voice-bots/',
    label: 'Explore voicebots',
    topicId: 'voice-bots',
  },
  {
    articles: ['rag-fine-tuning-or-both'],
    title: 'Could your team find a supported answer more easily?',
    copy: 'Explore an assistant shaped around maintained knowledge, useful questions and clear handling of missing information.',
    href: '/capabilities/chatbots/',
    label: 'Explore knowledge-grounded chatbots',
    topicId: 'chatbots',
  },
  {
    articles: [
      'training-data-quality-for-enterprise-models',
      'when-smaller-models-work-better',
      'private-enterprise-ai',
      'quantisation-without-guesswork',
      'distilling-domain-specific-small-models',
      'long-context-kv-cache-memory-budget',
      'speculative-decoding-explained',
      'optimising-llm-inference',
      'billion-parameter-models-modest-hardware',
    ],
    title: 'How would these choices affect your workload?',
    copy: 'Our proprietary model programme explores focused text and speech models, deployment choices and practical operating cost. It remains in development; current client solutions use established models.',
    href: '/research-development/proprietary-models/',
    label: 'Explore our model development direction',
    topicId: 'proprietary-models',
  },
];

export function articleJourney(id: string): ArticleJourney {
  return (
    articleJourneys.find((journey) => journey.articles.includes(id)) ?? {
      articles: [],
      title: 'Have a business problem in mind?',
      copy: 'Explore how we approach custom AI work, from a defined task to a result your team can evaluate.',
      href: '/solutions/',
      label: 'Explore custom solutions',
      topicId: 'help-me-decide',
    }
  );
}
