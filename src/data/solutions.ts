export const solutionAreas = [
  {
    id: 'customer-support',
    name: 'Customer support & voice assistance',
    short: 'Customer support',
    headline: 'Give every enquiry a clear next step.',
    description:
      'Bring customer questions, relevant knowledge and permitted business actions into one support workflow. Connect written or spoken conversations with the information needed to move a request forward.',
    situation:
      'A customer wants to change a delivery address. The answer depends on the order status and the applicable policy.',
    stages: [
      'Understand the request',
      'Check records and policy',
      'Prepare a resolution',
      'Resolve or hand over',
    ],
    uses: ['Order enquiries', 'Service guidance', 'Request intake'],
    evaluation:
      'Grounded answers, correct routing, completed requests and the effort needed for human review.',
    exception:
      'If the order has already shipped, the workflow explains the available next step. Missing records, conflicting information or restricted changes go to a person with the relevant context.',
    capabilities: [
      { id: 'ai-agents', label: 'AI agents' },
      { id: 'chatbots', label: 'Chatbots' },
      { id: 'voice-bots', label: 'Voicebots' },
      { id: 'speech-to-text', label: 'STT' },
      { id: 'text-to-speech', label: 'TTS' },
    ],
    reading: {
      href: '/blog/support-agents-that-resolve-requests/',
      title: 'Designing support workflows',
    },
  },
  {
    id: 'document-processing',
    name: 'Document & information processing',
    short: 'Documents',
    headline: 'Turn documents into information your team can use.',
    description:
      'Extract the details a process needs, compare them with agreed records and prepare the next step. Give uncertain fields and business exceptions a clear review path.',
    situation:
      'An invoice arrives with a supplier reference and line items, but the purchase-order reference is missing.',
    stages: [
      'Read the document content',
      'Structure required fields',
      'Check records and rules',
      'Prepare a reviewed update',
    ],
    uses: [
      'Invoice intake',
      'Document classification',
      'Application processing',
    ],
    evaluation:
      'Field accuracy, exception detection, correction effort and cost per completed document.',
    exception:
      'Uncertain extraction, missing references and mismatched records remain visible. A reviewer can correct or resolve them before an authorised update is prepared.',
    capabilities: [
      { id: 'ai-agents', label: 'AI agents' },
      { id: 'chatbots', label: 'Conversational clarification' },
    ],
    reading: {
      href: '/blog/agentic-invoice-to-erp-workflow/',
      title: 'From invoice to ERP',
    },
  },
  {
    id: 'employee-assistance',
    name: 'Internal knowledge & employee assistance',
    short: 'Employee assistance',
    headline: 'Find an answer. See what supports it.',
    description:
      'Help employees work with approved business information through a conversational interface. Connect answers to supporting material and make gaps in the available information visible.',
    situation:
      'An employee needs the process for requesting replacement equipment, without searching through several documents.',
    stages: [
      'Ask a question',
      'Retrieve approved material',
      'Explain with sources',
      'Clarify or refer',
    ],
    uses: [
      'Operating procedures',
      'Onboarding guidance',
      'Meeting summaries and draft actions',
    ],
    evaluation:
      'Source relevance, supported answers, appropriate handling of missing information and usefulness to employees.',
    exception:
      'When sources do not answer the question, the assistant asks for clarification or refers the employee to the right owner. Access follows the information permissions agreed for the project.',
    capabilities: [
      { id: 'chatbots', label: 'Chatbots' },
      { id: 'ai-agents', label: 'AI agents' },
      { id: 'speech-to-text', label: 'Spoken questions & transcripts' },
      { id: 'text-to-speech', label: 'Spoken answers' },
    ],
    reading: {
      href: '/blog/rag-fine-tuning-or-both/',
      title: 'Grounding answers in business knowledge',
    },
  },
  {
    id: 'sales-operations',
    name: 'Sales operations',
    short: 'Sales operations',
    headline: 'Move from an enquiry to a prepared next step.',
    description:
      'Organise incoming information and help your team prepare relevant follow-ups. Bring enquiry details and permitted account context into a brief that a salesperson can review.',
    situation:
      'A company asks about a transcription workflow for its service team. A salesperson needs the requirements and a useful follow-up.',
    stages: [
      'Capture the enquiry',
      'Assemble account context',
      'Draft the next step',
      'Review and approve',
    ],
    uses: [
      'Enquiry qualification',
      'Account briefs',
      'Follow-up and CRM preparation',
    ],
    evaluation:
      'Factual accuracy, useful qualification, draft correction effort and authorised updates.',
    exception:
      'Unverified account details remain marked as unknown. Sending messages and writing records follow the permissions and approval points defined with the sales team.',
    capabilities: [
      { id: 'ai-agents', label: 'AI agents' },
      { id: 'chatbots', label: 'Written enquiry intake' },
      { id: 'voice-bots', label: 'Spoken enquiry intake' },
      { id: 'speech-to-text', label: 'Conversation transcription' },
    ],
    reading: {
      href: '/blog/agentic-sales-operations-crm/',
      title: 'Reviewed sales and CRM workflows',
    },
  },
  {
    id: 'field-operations',
    name: 'Field operations & voice documentation',
    short: 'Field operations',
    headline: 'Speak the update. Prepare the record.',
    description:
      'Turn spoken observations into structured information for operational workflows. Shape the transcript and report around the terminology, fields and systems your team uses.',
    situation:
      'A technician records a short update after a service visit. The job record needs the work completed, parts used and follow-up required.',
    stages: [
      'Capture a spoken update',
      'Transcribe the recording',
      'Structure the job report',
      'Confirm missing details',
    ],
    uses: ['Maintenance reports', 'Inspection notes', 'Delivery exceptions'],
    evaluation:
      'Critical-field accuracy, terminology, handling of recording conditions and the effort needed to confirm a report.',
    exception:
      'Missing quantities, unclear names and uncertain transcription are flagged for confirmation. The review happens before an agreed record update.',
    capabilities: [
      { id: 'speech-to-text', label: 'STT' },
      { id: 'ai-agents', label: 'AI agents' },
      { id: 'text-to-speech', label: 'Spoken read-back' },
    ],
    reading: {
      href: '/blog/real-time-voice-agent-design/',
      title: 'Designing dependable voice interactions',
    },
  },
  {
    id: 'speech-content',
    name: 'Speech & content workflows',
    short: 'Speech & content',
    headline: 'Give information a spoken—or written—form.',
    description:
      'Build transcription and speech generation into your content and applications. Define the intended listeners or readers, the review process and the format your workflow needs.',
    situation:
      'A team wants readable versions of recordings, or spoken versions of written guidance and training material.',
    stages: [
      'Choose the source',
      'Transcribe or generate speech',
      'Review the result',
      'Prepare the required format',
    ],
    uses: [
      'Narration and spoken guidance',
      'Transcripts and captions',
      'Learning and accessible information',
    ],
    evaluation:
      'Transcript accuracy or pronunciation and intelligibility, alongside review effort, responsiveness and cost.',
    exception:
      'Pronunciation, terminology and transcription errors are reviewed against representative material. Language, voice suitability, usage rights and output formats are agreed for the project.',
    capabilities: [
      { id: 'speech-to-text', label: 'STT' },
      { id: 'text-to-speech', label: 'TTS' },
    ],
    reading: {
      href: '/blog/real-time-voice-agent-design/',
      title: 'The engineering behind speech workflows',
    },
  },
] as const;

export const deliveryStages = [
  [
    'Understand the workflow',
    'Identify the users, trigger, source information, systems and the difficulties worth addressing.',
  ],
  [
    'Define the scope',
    'Agree the intended output, permitted actions, review points and how success will be measured.',
  ],
  [
    'Build and evaluate',
    'Develop a bounded prototype using established models. Test representative cases, missing information and exceptions.',
  ],
  [
    'Prepare for operation',
    'Integrate the agreed systems and define monitoring, recovery, handover and operating responsibilities.',
  ],
] as const;
