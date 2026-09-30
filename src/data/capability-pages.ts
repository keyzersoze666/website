export interface CapabilityPage {
  id: string;
  lead: string;
  description: string;
  intro: string;
  uses: { title: string; copy: string }[];
  example: { title: string; intro: string; takeaway: string };
  decisions: { title: string; copy: string }[];
  inputs: string[];
  evaluation: { measure: string; approach: string }[];
  perspective: { title: string; copy: string };
  questions: { question: string; answer: string }[];
  reading: { href: string; title: string }[];
  invitation: string;
}

export const capabilityPages: CapabilityPage[] = [
  {
    id: 'ai-agents',
    lead: 'Connect a request to the work that follows.',
    description:
      'Custom AI agents that use business context and permitted tools, with explicit review points, recovery paths and task-based evaluation.',
    intro:
      'Some tasks need more than a written answer: a record must be checked, information compared and an action prepared. We build agent workflows around those steps, using established models for interpretation and deterministic code for fixed business rules.',
    uses: [
      {
        title: 'Prepare a business action',
        copy: 'Read a request, check the relevant records and prepare an update for an authorised person or system to approve.',
      },
      {
        title: 'Coordinate an exception',
        copy: 'Identify missing or conflicting information, gather the available context and route the case to its owner.',
      },
      {
        title: 'Work across sources',
        copy: 'Combine document content and permitted system records into a structured result with a trace of the decisions taken.',
      },
    ],
    example: {
      title: 'A delivery change with a review point.',
      intro:
        'This example design starts with a request to change an address. The workflow checks the order and the applicable rule before preparing a change. The sample below shows the decisions; it does not connect to an order system.',
      takeaway:
        'A successful lookup is not a successful change. The workflow reports completion only after the destination system confirms the authorised action.',
    },
    decisions: [
      {
        title: 'Separate interpretation from permission',
        copy: 'A model can identify what someone is asking for. The permitted actions, required fields and approval rules are defined in the application. We agree those boundaries before connecting a tool.',
      },
      {
        title: 'Make each tool specific',
        copy: 'A tool should have a clear input, output and failure response. Reading an order and changing its address are separate operations, with separate permissions. Available integration mechanisms determine what can be connected.',
      },
      {
        title: 'Plan for incomplete work',
        copy: 'Missing records, rejected approvals and temporary failures need explicit paths. Where a system supports them, action references help prevent duplicate writes during bounded retries. Persistent failures remain visible for review.',
      },
      {
        title: 'Keep enough context to investigate',
        copy: 'A useful trace records the sources consulted, proposed action, approval and confirmed result. The detail retained, access to it and retention period are agreed alongside the workflow.',
      },
    ],
    inputs: [
      'A real process description, including its exceptions.',
      'Representative requests and the expected outcomes.',
      'The systems and records each step needs.',
      'The people who own approvals and unresolved cases.',
    ],
    evaluation: [
      {
        measure: 'Task completion',
        approach:
          'Check the intended end state in the relevant system, including cases that should stop or be handed over.',
      },
      {
        measure: 'Action correctness',
        approach:
          'Inspect tool arguments, rule checks and approvals. Include requests that are ambiguous or outside the agreed scope.',
      },
      {
        measure: 'Recovery',
        approach:
          'Exercise timeouts, repeat requests and failed dependencies. Check that retries stay within limits and intended actions are not duplicated.',
      },
      {
        measure: 'Operating effort',
        approach:
          'Measure review time, corrections and cost per completed task under the agreed workload.',
      },
    ],
    perspective: {
      title: 'Start with the simplest useful workflow.',
      copy: 'A fixed process may be better served by ordinary automation. We introduce model-driven interpretation where the inputs or decisions need it. Extra agents and extra steps should earn their place through evaluation.',
    },
    questions: [
      {
        question: 'Can an agent make changes without approval?',
        answer:
          'That is a project decision, not a default capability. We define which actions may run independently, which require review and which remain outside the system. Early pilots can prepare actions while people retain approval.',
      },
      {
        question: 'Does every workflow need several agents?',
        answer:
          'No. One bounded workflow is often easier to inspect and operate. Specialised agents can help when tasks need different context or can run independently, but they also add coordination and failure paths.',
      },
      {
        question: 'Is the workflow designer a deployed automation platform?',
        answer:
          'The R&D designer is a browser-based planning tool for editing a graph and walking through sample data. A client solution needs separately implemented model calls, integrations, permissions and operating arrangements.',
      },
    ],
    reading: [
      {
        href: '/blog/evaluating-agents-beyond-the-demo/',
        title: 'Evaluating agents beyond the demo',
      },
      {
        href: '/blog/production-ai-monitoring-and-rollback/',
        title: 'From prototype to production',
      },
    ],
    invitation:
      'Bring one process, its source systems and a few difficult cases. We can define what the agent should do and how to judge the result.',
  },
  {
    id: 'chatbots',
    lead: 'Answers that can be checked against your information.',
    description:
      'Custom chatbots built around approved knowledge, useful conversation flows, source-aware answers and clear escalation to people.',
    intro:
      'A useful business chatbot needs reliable source material and a clear job. We work on the information it can use, the questions it should answer and the point at which a conversation needs clarification, a business action or a person.',
    uses: [
      {
        title: 'Employee knowledge',
        copy: 'Help staff navigate approved procedures and documentation, with supporting material they can inspect.',
      },
      {
        title: 'Customer guidance',
        copy: 'Explain a service or process using maintained business information, then guide the visitor to an appropriate next step.',
      },
      {
        title: 'Structured intake',
        copy: 'Gather the details a request needs through conversation, confirm them and pass a useful brief into the agreed workflow.',
      },
    ],
    example: {
      title: 'An answer, its source and its boundary.',
      intro:
        'The sample equipment guide below supports a question about replacement requests. It says nothing about temporary equipment. A grounded conversation should preserve that distinction.',
      takeaway:
        'Showing a source link is useful only if that source supports the answer. Retrieval quality and answer accuracy need to be checked together.',
    },
    decisions: [
      {
        title: 'Establish which information is authoritative',
        copy: 'We identify the documents that should govern an answer, who maintains them and how updates reach the assistant. Conflicting versions and obsolete guidance need handling before they become confident replies.',
      },
      {
        title: 'Design retrieval around real questions',
        copy: 'Document structure, terminology and access permissions affect what is found. We test representative questions against the retrieved passages before assessing the final answer.',
      },
      {
        title: 'Give the conversation a useful next step',
        copy: 'An assistant may answer, ask one necessary question or hand over with context. We define these paths around the service, including where a conversation becomes an agent workflow with permitted tools.',
      },
      {
        title: 'Fit the interface to its users',
        copy: 'We agree the channel, response length, source presentation and handoff experience. An internal procedure assistant and a customer-facing guide have different information and interaction needs.',
      },
    ],
    inputs: [
      'Approved documents and an owner for keeping them current.',
      'Questions people actually ask, including unclear ones.',
      'Examples of a useful answer and an appropriate handoff.',
      'The intended users, access rules and conversation channel.',
    ],
    evaluation: [
      {
        measure: 'Retrieval',
        approach:
          'Check whether the relevant, permitted source material is found for each question.',
      },
      {
        measure: 'Supported answers',
        approach:
          'Review factual correctness, whether cited passages support the response and how conflicting information is handled.',
      },
      {
        measure: 'Conversation handling',
        approach:
          'Include follow-ups, missing details, unanswered questions and successful handoffs.',
      },
      {
        measure: 'Maintenance',
        approach:
          'Change or remove source material and verify that subsequent answers reflect the update.',
      },
    ],
    perspective: {
      title: 'Knowledge needs an owner.',
      copy: 'Connecting more documents does not automatically improve an assistant. A smaller, maintained collection can be more useful than a large set with conflicting instructions. Information ownership is part of the project design.',
    },
    questions: [
      {
        question: 'Can it work with private company information?',
        answer:
          'We assess the sources, user permissions and processing arrangements together. Retrieval must respect the access rules agreed for the application. Hosting, administrative access, conversation logging and retention are defined for the project.',
      },
      {
        question: 'Does it need to be fine-tuned on our documents?',
        answer:
          'Often the first step is retrieval from maintained sources. Fine-tuning serves different needs, such as a particular response format or specialised behaviour. We choose the approach after testing what the task requires.',
      },
      {
        question: 'Can it update records as well as answer questions?',
        answer:
          'It can be designed to request a permitted tool action. We treat that as an additional workflow with explicit inputs, confirmation and permissions. An answer grounded in a document does not itself authorise a system change.',
      },
    ],
    reading: [
      {
        href: '/blog/rag-fine-tuning-or-both/',
        title: 'RAG, fine-tuning or both?',
      },
      {
        href: '/blog/support-agents-that-resolve-requests/',
        title: 'Support agents that resolve requests',
      },
    ],
    invitation:
      'Start with a maintained set of documents and the questions your users ask. We can assess the information, conversation and handoff together.',
  },
  {
    id: 'voice-bots',
    lead: 'A voice conversation that can listen, clarify and hand over.',
    description:
      'Custom voicebots with speech recognition, turn-taking, interruption handling, explicit confirmations and business workflow integration.',
    intro:
      'Spoken interaction adds timing and uncertainty to a conversation. We design the listening, response and handoff together, so the system can collect the right information, handle corrections and report only actions that have been confirmed.',
    uses: [
      {
        title: 'Service enquiries',
        copy: 'Provide spoken guidance, collect the details of a request and route it with the context a service team needs.',
      },
      {
        title: 'Guided intake',
        copy: 'Gather required fields in a short dialogue, read back important details and prepare a structured request.',
      },
      {
        title: 'Voice inside an application',
        copy: 'Add a spoken interaction to an agreed task, with the microphone, playback and visual state designed together.',
      },
    ],
    example: {
      title: 'A correction changes the request, not just the transcript.',
      intro:
        'In this illustrative service-intake dialogue, the caller changes their preferred day while the assistant is speaking. The intended workflow stops the old response, updates the request and confirms the corrected preference.',
      takeaway:
        'A preferred time is different from a confirmed appointment. The assistant should describe the state returned by the booking system or the team handling the request.',
    },
    decisions: [
      {
        title: 'Manage turns and interruptions',
        copy: 'We define when listening starts, how an end of turn is detected and what happens when someone speaks during playback. Stopping sound is one part; the conversation must also discard or revise the interrupted response.',
      },
      {
        title: 'Treat important details differently',
        copy: 'Names, addresses, identifiers and quantities deserve explicit checks. We design clarification and read-back around the consequences of a mistake, rather than asking the same confirmation after every sentence.',
      },
      {
        title: 'Connect the right channel',
        copy: 'A browser microphone and a telephone connection have different audio and transport constraints. We assess the available channel, recording conditions and integration options as part of the scope.',
      },
      {
        title: 'Make waiting and handoff understandable',
        copy: 'A slow lookup needs a useful conversational state. A transfer needs the request, confirmed details and reason for handoff. We also define the response to lost audio or an unavailable business system.',
      },
    ],
    inputs: [
      'The intended channel: telephone, browser or application.',
      'The language, typical callers and recording conditions.',
      'A short task, required fields and examples of corrections.',
      'The destination workflow and a defined human handoff.',
    ],
    evaluation: [
      {
        measure: 'Responsiveness',
        approach:
          'Measure the time from the end of speech to useful output across recognition, model, tool and speech-generation steps.',
      },
      {
        measure: 'Corrections',
        approach:
          'Test interruptions, changed details, short answers and pauses. Check that the intended request is preserved.',
      },
      {
        measure: 'Task outcome',
        approach:
          'Review captured fields, confirmed actions and successful handoffs across representative calls.',
      },
      {
        measure: 'Audio conditions',
        approach:
          'Test the selected language and channel with realistic noise, speech pace, accents and connection behaviour.',
      },
    ],
    perspective: {
      title: 'The full conversation determines the delay.',
      copy: 'A fast speech model cannot remove the time spent finding information or waiting for a business system. We inspect the complete response path, then decide where streaming or a simpler interaction would help.',
    },
    questions: [
      {
        question: 'Is a voicebot just STT followed by TTS?',
        answer:
          'Speech recognition and synthesis are important parts of many voice systems. The conversation also needs turn detection, interruption handling, state, confirmations and tool results. Some models combine audio tasks, but these interaction decisions still need to be designed.',
      },
      {
        question: 'Can it book appointments or make account changes?',
        answer:
          'That depends on an available integration and the permissions agreed for it. We define the required checks and the meaning of a confirmed result. If the destination cannot confirm an action, the conversation should not claim it is complete.',
      },
      {
        question: 'Which voices and languages can we use?',
        answer:
          'We select and evaluate candidate models for the intended language, voice and channel. Pronunciation, comprehension and recording conditions are tested with representative material before making coverage or quality claims.',
      },
    ],
    reading: [
      {
        href: '/blog/real-time-voice-agent-design/',
        title: 'Real-time voice agent design',
      },
      {
        href: '/blog/evaluating-agents-beyond-the-demo/',
        title: 'Evaluating the complete task',
      },
    ],
    invitation:
      'Bring a short dialogue, the channel it needs to run on and the outcome a caller should reach. We can define an initial voice workflow around those requirements.',
  },
  {
    id: 'text-to-speech',
    lead: 'Spoken output shaped around what people need to hear.',
    description:
      'Custom text-to-speech workflows for applications and content, with pronunciation rules, suitable voice selection and listener-based evaluation.',
    intro:
      'A voice needs to fit its material and setting. We design speech-generation workflows around the text, pronunciation, pacing and output requirements, then evaluate candidate models with the people who will listen.',
    uses: [
      {
        title: 'Application speech',
        copy: 'Read an update, instruction or assistant response aloud, with wording and timing suited to the interaction.',
      },
      {
        title: 'Narration and learning',
        copy: 'Prepare spoken versions of written guidance or training material, including a review and regeneration process.',
      },
      {
        title: 'Accessible information',
        copy: 'Offer a spoken form of selected content, with suitable playback and access to the original text.',
      },
    ],
    example: {
      title: 'Decide how the text should sound.',
      intro:
        'This illustrative script shows the preparation before speech generation. An order identifier and a clock time need a consistent spoken form. These are editorial choices, not audio samples from a released SAMVIT Labs model.',
      takeaway:
        'Ambiguous dates, abbreviations and identifiers need an agreed interpretation. A pleasant voice does not make an incorrect reading acceptable.',
    },
    decisions: [
      {
        title: 'Prepare text for speech',
        copy: 'We define how identifiers, numbers, dates, abbreviations and domain terms should be read. Normalisation must preserve meaning. Ambiguous input can be returned for clarification before it reaches the voice model.',
      },
      {
        title: 'Choose a voice for the setting',
        copy: 'Short service messages and long learning passages place different demands on pace and expression. We compare suitable candidate voices using representative scripts and agree the usage rights for the selected voice.',
      },
      {
        title: 'Plan delivery and playback',
        copy: 'A live assistant may need streamed output; a narration workflow may produce complete files. We agree formats, chunking, playback controls and how an interrupted or failed generation is handled.',
      },
      {
        title: 'Make revisions manageable',
        copy: 'Content changes should be traceable to the script and pronunciation choices used. Where appropriate, repeated approved passages can be generated ahead of time. Dynamic content needs its own response and review requirements.',
      },
    ],
    inputs: [
      'Representative scripts, including difficult terms and numbers.',
      'The intended language, listeners and listening setting.',
      'Pronunciation preferences and the approved source text.',
      'File or streaming requirements and the application using the audio.',
    ],
    evaluation: [
      {
        measure: 'Pronunciation',
        approach:
          'Review names, terminology, identifiers, numbers and the meaning preserved by text normalisation.',
      },
      {
        measure: 'Intelligibility',
        approach:
          'Ask representative listeners to assess whether the words are understandable in the intended setting.',
      },
      {
        measure: 'Consistency',
        approach:
          'Check pacing, voice behaviour and pronunciation across short and long passages.',
      },
      {
        measure: 'Delivery',
        approach:
          'Measure generation and playback behaviour, output format suitability and cost for the expected content volume.',
      },
    ],
    perspective: {
      title: 'Start the voice test with difficult text.',
      copy: 'A familiar paragraph can hide problems with a business script. Include the product names, codes, units and sentence lengths that the application will actually speak. Listener review should use that material.',
    },
    questions: [
      {
        question: 'Can we hear a sample before choosing a model?',
        answer:
          'A scoped evaluation should include candidate voices reading agreed scripts. That makes pronunciation and suitability easier to judge than a generic voice demo. This page illustrates the preparation process; it does not include playable model samples.',
      },
      {
        question: 'Can the voice sound like a particular person?',
        answer:
          'That would require a separate scope covering suitable voice data, the speaker’s permission and licensing, model suitability and acceptable use. A standard speech-generation integration does not imply a custom cloned voice.',
      },
      {
        question: 'Can speech be generated as the text arrives?',
        answer:
          'Streaming may be suitable for a conversational application. We assess the available model and delivery path, how much text must be available for sensible phrasing, and what should happen when a response changes or is interrupted.',
      },
    ],
    reading: [
      {
        href: '/blog/real-time-voice-agent-design/',
        title: 'Speech within a real-time conversation',
      },
      {
        href: '/research-development/proprietary-models/#voice-models-title',
        title: 'Our speech model development direction',
      },
    ],
    invitation:
      'Start with a script and the place where it will be heard. We can define pronunciation, voice evaluation and the audio delivery requirements.',
  },
  {
    id: 'speech-to-text',
    lead: 'Transcription designed around the audio your team records.',
    description:
      'Custom speech-to-text workflows for representative recordings, specialist terminology, reviewable transcripts and connected business records.',
    intro:
      'The useful question is whether a transcript preserves the information your workflow needs. We assess the audio source, language, terminology and output format, then test recognition and review against representative recordings.',
    uses: [
      {
        title: 'Field and service notes',
        copy: 'Turn spoken updates into a transcript that can be reviewed and used to prepare a structured job record.',
      },
      {
        title: 'Recorded conversations',
        copy: 'Create readable source material for search, review or a separately evaluated summarisation workflow.',
      },
      {
        title: 'Speech inside an application',
        copy: 'Use spoken input in an assistant or form, with explicit confirmation of details that matter to the task.',
      },
    ],
    example: {
      title: 'Keep uncertain details visible.',
      intro:
        'This is an illustrative transcript-review format for a service note. No recording or live recognition model is used on this page. The part identifier is held for confirmation before the note becomes a job-record update.',
      takeaway:
        'A readable transcript can still contain a wrong name, quantity or part number. Check the fields that matter to the business task, alongside overall transcription quality.',
    },
    decisions: [
      {
        title: 'Work with the actual recording conditions',
        copy: 'Microphones, background noise, compressed telephone audio and overlapping speakers affect recognition. We use representative recordings to assess suitability, including difficult cases rather than only clean samples.',
      },
      {
        title: 'Define the transcript you need',
        copy: 'Verbatim wording, readable punctuation, timestamps and speaker labels serve different purposes. We agree the format and test the required features. Identifying a speaker by name requires separate information; a speaker label alone does not establish identity.',
      },
      {
        title: 'Handle terminology and important fields',
        copy: 'A glossary and any supported model context can help with domain terms. Names, quantities and identifiers still need task-specific checks. Confidence scores can help route review, but do not establish that a transcript is correct.',
      },
      {
        title: 'Separate transcription from interpretation',
        copy: 'A transcript records speech. A summary, classification or structured report adds another processing step and another source of error. We evaluate those outputs separately and preserve access to the underlying material as agreed.',
      },
    ],
    inputs: [
      'Representative recordings with permission for the intended processing.',
      'The language, audio sources and expected recording conditions.',
      'Important terminology, identifiers and example corrected transcripts.',
      'Required timing, speaker labels, review process and destination format.',
    ],
    evaluation: [
      {
        measure: 'Transcription errors',
        approach:
          'Compare against checked reference transcripts. Word error rate counts substitutions, deletions and insertions relative to the reference word count.',
      },
      {
        measure: 'Critical information',
        approach:
          'Check names, dates, quantities and domain identifiers separately. A low overall error rate can hide an important field error.',
      },
      {
        measure: 'Required structure',
        approach:
          'Evaluate timestamps, segmentation and speaker labels where they are part of the agreed output.',
      },
      {
        measure: 'Workflow effort',
        approach:
          'Measure correction time, processing delay and cost per minute of audio under stated recording and workload conditions.',
      },
    ],
    perspective: {
      title: 'Measure the output you will depend on.',
      copy: 'A search archive and a job-record update have different tolerances for errors. The first may need discoverable wording; the second may depend on an exact asset identifier. The evaluation should reflect that difference.',
    },
    questions: [
      {
        question: 'Can it handle our accents and specialist terms?',
        answer:
          'That needs to be assessed with representative recordings in the intended language and domain. We compare candidate models and review methods using that material. Broad language coverage or an accuracy percentage should follow a defined evaluation.',
      },
      {
        question: 'Do we need live transcription or file processing?',
        answer:
          'Live interaction needs streaming input, partial results and decisions about when a segment is final. Recorded-file processing can prioritise complete context and review. We select the flow around the application’s timing requirements.',
      },
      {
        question:
          'Can the transcript automatically become a summary or report?',
        answer:
          'Yes, as a separately designed processing step using an appropriate text model or rules. We define the source fields, treatment of uncertainty and review requirements, then evaluate the report as well as the transcript.',
      },
    ],
    reading: [
      {
        href: '/blog/real-time-voice-agent-design/',
        title: 'Recognition in a real-time voice system',
      },
      {
        href: '/research-development/proprietary-models/#voice-models-title',
        title: 'Our speech recognition development direction',
      },
    ],
    invitation:
      'Bring representative audio, the terminology that matters and an example of the output you need. We can define a useful transcription evaluation.',
  },
];
