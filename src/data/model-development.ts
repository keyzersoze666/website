export const modelDirections = [
  {
    id: 'structured-text',
    number: '01',
    group: 'text',
    name: 'Structured text',
    type: 'Extraction and classification',
    description:
      'Small language models that turn business text into defined fields. A useful starting point for requests, records and documents with a clear structure.',
    specialisation:
      'Your terminology, field definitions and representative examples.',
    evaluation:
      'Field accuracy, valid output and recognition of missing information.',
    example: {
      label: 'A service request',
      input: 'Order 4821 arrived with two damaged units.',
      output: [
        ['Order reference', '4821'],
        ['Issue', 'Damaged items'],
        ['Units affected', '2'],
      ],
      note: 'Unstated fields, such as delivery date, should remain unknown.',
    },
    href: '/capabilities/ai-agents/',
    link: 'Explore custom AI agents',
  },
  {
    id: 'domain-language',
    number: '02',
    group: 'text',
    name: 'Domain language',
    type: 'Context-based responses',
    description:
      'Focused language models for drafting answers from supplied business knowledge. Training can shape terminology and response behaviour; retrieved material supplies current facts.',
    specialisation:
      'Domain vocabulary, response style, source use and escalation rules.',
    evaluation:
      'Factual support, useful answers and appropriate requests for review.',
    example: {
      label: 'A support question',
      input: 'Can I return an opened item?',
      output: [
        ['Reference material', 'The supplied returns policy'],
        [
          'Target response',
          'An answer supported by the relevant policy passage',
        ],
        [
          'When the policy is silent',
          'Ask for clarification or refer for review',
        ],
      ],
      note: 'Answers should cite the supplied policy and request review when it does not resolve the question.',
    },
    href: '/capabilities/chatbots/',
    link: 'Explore chatbots',
  },
  {
    id: 'focused-code',
    number: '03',
    group: 'text',
    name: 'Focused code',
    type: 'Language-specific coding assistance',
    description:
      'Code models scoped to a programming language and a defined development task. One starting point is Python test generation for a chosen framework and repository.',
    specialisation:
      'Language, libraries, repository conventions and a bounded task.',
    evaluation:
      'Tests that run, detect faults and follow the documented behaviour.',
    example: {
      label: 'Python / pytest',
      input:
        'Draft a test for a function that trims spaces and uppercases an order reference.',
      output: [
        ['Target assertion', 'normalise_reference(" ab-42 ") == "AB-42"'],
        ['Next step', 'Run the test against the implementation'],
        ['Review', 'A developer checks the test and its assumptions'],
      ],
      note: 'The model proposes code. A coding agent adds tools, execution and workflow controls around it.',
    },
    href: '/capabilities/ai-agents/',
    link: 'Explore agent workflows',
  },
  {
    id: 'speech-recognition',
    number: '04',
    group: 'voice',
    name: 'Speech recognition',
    type: 'Language-specific speech to text',
    description:
      'Speech models focused on a selected language and business setting. The work starts with representative speakers, relevant terminology and the conditions in which audio is recorded.',
    specialisation:
      'A chosen language, domain vocabulary and recording conditions.',
    evaluation:
      'Transcription errors and accuracy on names, references, dates and amounts.',
    example: {
      label: 'A service-call transcription task',
      input:
        'A caller gives an order reference, explains an issue and asks for a follow-up.',
      output: [
        ['Target output', 'A readable transcript in the selected language'],
        ['Critical details', 'Preserve order references, names and numbers'],
        ['Unclear audio', 'Flag uncertainty for review'],
      ],
      note: 'The selected language, vocabulary and recording conditions define the evaluation set.',
    },
    href: '/capabilities/speech-to-text/',
    link: 'Explore speech to text',
  },
  {
    id: 'speech-synthesis',
    number: '05',
    group: 'voice',
    name: 'Speech synthesis',
    type: 'Language-specific text to speech',
    description:
      'Speech models for clear, purposeful audio in a selected language. Initial tasks can be short instructions, service confirmations and spoken application responses.',
    specialisation:
      'Pronunciation, speaking style and appropriately licensed voice data.',
    evaluation:
      'Intelligibility, names and numbers, listener feedback and generation time.',
    example: {
      label: 'A spoken confirmation',
      input:
        'Your appointment is on 14 March at 10:30. Your reference is AB-42.',
      output: [
        ['Target output', 'Spoken audio in the selected language'],
        ['Details to preserve', 'The date, time and reference'],
        ['Listener review', 'Check pronunciation, pacing and intelligibility'],
      ],
      note: 'Pronunciation and pacing need listener evaluation before audio samples can represent a released model.',
    },
    href: '/capabilities/text-to-speech/',
    link: 'Explore text to speech',
  },
] as const;

export const deploymentOptions = [
  {
    number: '01',
    name: 'Client operated',
    description:
      'Your team runs the model within your approved infrastructure.',
    control: 'Your team administers the environment and controls access.',
    cost: 'Allow for hardware or cloud capacity, maintenance and internal expertise.',
  },
  {
    number: '02',
    name: 'SAMVIT Labs managed, in your environment',
    description:
      'Your organisation controls the hosting account. SAMVIT Labs operates the system with agreed permissions.',
    control:
      'Hosting ownership stays with you; operational access is explicitly defined.',
    cost: 'Infrastructure costs sit alongside an agreed management service.',
  },
  {
    number: '03',
    name: 'SAMVIT Labs hosted',
    description:
      'SAMVIT Labs runs the model in an environment agreed with your organisation.',
    control:
      'SAMVIT Labs processes data in this option. Location, isolation, access and retention need clear agreements.',
    cost: 'Managed operation reduces your internal workload. Dedicated capacity can cost more at low usage.',
  },
] as const;

export const evaluationStages = [
  {
    name: 'Define the task',
    copy: 'Agree the output, representative examples, sensitive fields and the conditions in which the model will be used.',
  },
  {
    name: 'Establish a baseline',
    copy: 'Evaluate a suitable starting model and record quality, response time and resource use on the same workload.',
  },
  {
    name: 'Adapt and evaluate',
    copy: 'Use task-specific training or compression where appropriate. Test on held-out examples and inspect failures.',
  },
  {
    name: 'Document the release',
    copy: 'Record intended use, tested hardware, results, limitations, licensing and access options before release.',
  },
] as const;
