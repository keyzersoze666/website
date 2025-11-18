export const enquiryTopics = [
  {
    id: 'customer-support',
    label: 'Customer support & voice assistance',
    group: 'Business workflows',
    href: '/solutions/#customer-support',
  },
  {
    id: 'document-processing',
    label: 'Document & information processing',
    group: 'Business workflows',
    href: '/solutions/#document-processing',
  },
  {
    id: 'employee-assistance',
    label: 'Internal knowledge & employee assistance',
    group: 'Business workflows',
    href: '/solutions/#employee-assistance',
  },
  {
    id: 'sales-operations',
    label: 'Sales operations',
    group: 'Business workflows',
    href: '/solutions/#sales-operations',
  },
  {
    id: 'field-operations',
    label: 'Field operations & voice documentation',
    group: 'Business workflows',
    href: '/solutions/#field-operations',
  },
  {
    id: 'speech-content',
    label: 'Speech & content',
    group: 'Business workflows',
    href: '/solutions/#speech-content',
  },
  {
    id: 'ai-agents',
    label: 'Custom AI agents',
    group: 'AI capabilities',
    href: '/capabilities/ai-agents/',
  },
  {
    id: 'chatbots',
    label: 'Chatbots',
    group: 'AI capabilities',
    href: '/capabilities/chatbots/',
  },
  {
    id: 'voice-bots',
    label: 'Voicebots',
    group: 'AI capabilities',
    href: '/capabilities/voice-bots/',
  },
  {
    id: 'text-to-speech',
    label: 'Text to speech',
    group: 'AI capabilities',
    href: '/capabilities/text-to-speech/',
  },
  {
    id: 'speech-to-text',
    label: 'Speech to text',
    group: 'AI capabilities',
    href: '/capabilities/speech-to-text/',
  },
  {
    id: 'proprietary-models',
    label: 'Proprietary model development',
    group: 'Research & development',
    href: '/research-development/proprietary-models/',
  },
  {
    id: 'workflow-designer',
    label: 'Workflow designer',
    group: 'Research & development',
    href: '/research-development/workflow-designer/',
  },
  {
    id: 'combined',
    label: 'A combination of capabilities',
    group: 'Your starting point',
    href: '/solutions/',
  },
  {
    id: 'help-me-decide',
    label: 'Help me define the right approach',
    group: 'Your starting point',
    href: '/solutions/',
  },
] as const;

type EnquiryTopic = (typeof enquiryTopics)[number];
export type EnquiryKind = 'contact' | 'demo';

export function findEnquiryTopic(
  id: string | null | undefined
): EnquiryTopic | undefined {
  return enquiryTopics.find((topic) => topic.id === id);
}

export function enquiryHref(kind: EnquiryKind, topicId?: string): string {
  const path = kind === 'demo' ? '/book-a-demo/' : '/contact/';
  const topic = findEnquiryTopic(topicId);
  return topic ? `${path}?topic=${encodeURIComponent(topic.id)}` : path;
}

export function enquiryBrief(
  values: {
    name: string;
    company: string;
    email: string;
    topicId: string;
    message: string;
  },
  kind: EnquiryKind
): string {
  const topic = findEnquiryTopic(values.topicId);
  const subject = kind === 'demo' ? 'a walkthrough' : 'a project';
  return `${values.name.trim()} from ${values.company.trim()} would like to discuss ${subject}.\n\nArea of interest: ${topic?.label ?? 'A business workflow'}.\n\n${values.message.trim()}\n\nContact: ${values.name.trim()} at ${values.email.trim()}.`;
}
