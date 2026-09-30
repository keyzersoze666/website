---
title: 'Real-Time Voice Agents: Designing for Latency, Interruptions and Reliable Actions'
description: 'A practical voice-agent design guide covering response budgets, turn detection, barge-in, transcription errors and the difference between stopping speech and cancelling a transaction.'
publishedAt: 2026-06-19
author: samvit-labs-research
category: Engineering
articleType: Engineering guide
tags: [voice agents, speech recognition, real-time systems]
cover: /journal/figures/voice-response-budget.svg
coverAlt: 'A worked voice response budget divides an illustrative one-second delay among end-of-turn detection, transcription, model output, speech synthesis and transport.'
evidenceNote: 'The latency values are invented for a sequential worked example. They are not component benchmarks, production percentiles or a promise of one-second responses. The control diagram is a proposed design.'
draft: false
references:
  - id: whisper
    title: 'Robust Speech Recognition via Large-Scale Weak Supervision'
    author: 'Alec Radford and colleagues · version 1'
    url: 'https://arxiv.org/abs/2212.04356v1'
    publishedAt: 2022-12-06
  - id: moshi
    title: 'Moshi: a speech-text foundation model for real-time dialogue'
    author: 'Alexandre Défossez and colleagues · version 1'
    url: 'https://arxiv.org/abs/2410.00037v1'
    publishedAt: 2024-09-17
  - id: webrtc
    title: 'WebRTC 1.0: Real-Time Communication Between Browsers'
    author: 'W3C Recommendation · 26 January 2021'
    url: 'https://www.w3.org/TR/2021/REC-webrtc-20210126/'
    publishedAt: 2021-01-26
---

A caller says, “Move my appointment to Thursday,” pauses and adds, “after three.” If an agent answers during the pause, it has reacted quickly but understood too early. If it waits several seconds after the complete request, the conversation feels broken.

Voice-agent design is partly a timing problem and partly a state-management problem. The system must decide when a person has finished, stop speaking when interrupted and keep track of which business actions actually occurred.

A convincing voice demo can hide these problems because the speaker follows a predictable script. A useful evaluation needs pauses, corrections, background noise and uncertain tool outcomes.

## Budget the time until useful audio

Measure response latency from a defined event. For a caller-facing metric, one useful interval starts when the caller actually finishes speaking and ends when the first meaningful response is audible. A network timestamp or the first text token answers a different question.

In an invented sequential example, allow 350 milliseconds for end-of-turn waiting, 120 for transcription finalization, 280 for the model's first useful output, 150 for the first speech audio and 100 for transport and playout.

$$
T_{\mathrm{audible}}=350+120+280+150+100=1000\text{ ms}
$$

<figure>
<a href="/journal/figures/voice-response-budget.svg" data-figure><img src="/journal/figures/voice-response-budget.svg" width="1200" height="750" alt="A hypothetical sequential voice turn totals one thousand milliseconds: 350 for turn waiting, 120 for transcription, 280 for model output, 150 for speech and 100 for transport." loading="lazy" /></a>
<figcaption><strong>Figure 1.</strong> An illustrative budget for one sequential turn. Real streaming stages can overlap. These values are not measured component p95 latencies and should not be interpreted as such. <a href="/journal/figures/voice-response-budget.csv" download>Download the calculation data</a>.</figcaption>
</figure>

Reducing the waiting stage from 350 to 150 milliseconds saves 200 milliseconds in this example. It may also cause more premature responses. Judge the change with both timing and turn-completion accuracy.

For a running system, record end-to-end observations and compute percentiles from those observations. Adding component p95 values does not generally produce the system's p95 because slow components need not occur on the same requests.

## Listening quality includes the important words

Whisper's research demonstrates the value of large-scale weak supervision for robust speech recognition across varied settings. A broad speech benchmark, however, does not establish whether a particular agent correctly hears your account numbers, product names or appointment times. <a href="#ref-whisper" id="cite-whisper" class="citation">[1]</a>

A common transcription metric is word error rate:

$$
\mathrm{WER}=\frac{S+D+I}{N}
$$

$S$, $D$ and $I$ count substitutions, deletions and insertions against a reference containing $N$ words. Three substitutions, two deletions and one insertion in a hundred-word reference give 6% WER. That percentage treats errors uniformly even though the business consequences differ.

Track critical-slot accuracy as well. Mishearing “fifteen” as “fifty” can matter more than losing a filler word. For a booking task, evaluate the requested date, time, location and identity fields separately, then check the completed booking against the caller's confirmed intent.

Test accents, speaking rates, telephone codecs and realistic noise. Use speakers and sessions that were not used for prompt or model tuning. A small clean-audio test cannot support a broad claim about real callers.

## Decide whether the turn has ended

Voice activity detection identifies speech-like activity and silence. Silence does not always mean the user has finished. People pause while recalling a reference number or deciding how to phrase a correction.

Turn detection can also use linguistic or acoustic context. For example, “my account number is…” is likely incomplete even if followed by a pause. Test this with the actual languages and interaction patterns the agent serves.

Speech-to-speech research such as Moshi explores full-duplex dialogue rather than relying entirely on a segmented transcription-to-text-to-speech pipeline. It highlights the importance of overlap and non-verbal information. It does not remove the need to define business authorization and transaction state outside the conversational model. <a href="#ref-moshi" id="cite-moshi" class="citation">[2]</a>

Keep the first pilot's turn rules understandable. Log early cut-ins, long waits and cases where a short acknowledgement was mistaken for a new instruction. Tune against those errors rather than only trying to lower average latency.

## Barge-in needs more than a mute button

When a caller interrupts, stop queued audio promptly and prevent stale generation from continuing to fill the playback buffer. Record how much of the response was actually played. The conversation history should not imply the caller heard a confirmation that never reached them.

Distinguish a brief acknowledgement from a change of intent when the application can support that distinction. “Yes” while the agent is explaining a policy may be a backchannel; “No, Friday” is a correction. Misclassifying either can damage the dialogue.

Browser-based media transport can use WebRTC, whose W3C specification defines peer-connection mechanisms for real-time communication. Transport is still only one layer: application buffering, model generation and playback control determine what the caller experiences above it. <a href="#ref-webrtc" id="cite-webrtc" class="citation">[3]</a>

Measure interruption-stop delay at the audio output, not merely when the application emits a cancellation event. Buffered audio may continue after that event unless the playback path also clears it.

## Keep speech state separate from action state

Suppose the agent submitted an appointment change and began saying, “Your appointment is now…” The caller interrupts with “Wait.” Stopping the sentence does not undo the submitted change.

Maintain an action record with states such as proposed, authorized, submitted, confirmed and unknown. Reconcile a submitted action before deciding whether it can be cancelled or changed. An unknown result after a timeout is not evidence of failure.

<figure>
<a href="/journal/figures/voice-interruption-state.svg" data-figure><img src="/journal/figures/voice-interruption-state.svg" width="1200" height="750" alt="An illustrative design separates caller interruption and audio cancellation from the submitted action record, status reconciliation and verified outcome confirmation." loading="lazy" /></a>
<figcaption><strong>Figure 2.</strong> Two kinds of state with different responsibilities. Audio cancellation affects what plays next. Transaction reconciliation establishes what the business system has already done.</figcaption>
</figure>

For consequential actions, read back the critical details before submission and obtain the required confirmation. Bind that confirmation to a specific proposed action. If the caller changes the date, an earlier confirmation of a different date should not silently authorize the new one.

Use a stable operation identifier for retryable actions, follow the connected system's idempotency contract and verify the final record. Escalate unresolved outcomes with a concise summary of the confirmed facts and the action state.

## Make the test set sound like real conversations

A voice-agent evaluation should include successful turns and deliberately awkward ones:

| Test                              | What to observe                                                |
| --------------------------------- | -------------------------------------------------------------- |
| Mid-sentence pause                | Whether the agent answers before the request is complete       |
| Correction during playback        | Whether stale speech stops and the new intent is retained      |
| Similar-sounding identifiers      | Whether critical fields are confirmed accurately               |
| Tool timeout after submission     | Whether the agent reconciles rather than duplicates the action |
| Long silence or background speech | Whether turn state remains sensible                            |
| Human handoff                     | Whether the next person receives verified context              |

Report task completion, critical-slot correctness, premature-response rate, interruption-stop delay and response-latency distributions. Include failure and handoff cases in the operational picture; excluding them can make the successful subset look deceptively smooth.

The best first voice workflow is narrow enough to inspect turn by turn. A scheduling assistant for a clearly defined service is easier to evaluate than an unrestricted telephone concierge. Add breadth after the system consistently hears the relevant details, handles corrections and confirms only the actions it can verify.
