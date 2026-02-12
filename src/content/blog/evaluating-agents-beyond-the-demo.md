---
title: 'Evaluating Agents Beyond the Demo: Completion, Reliability and Human Review'
description: 'How to test an agent against business outcomes, distinguish autonomous coverage from assisted completion and measure whether success survives repeated attempts.'
publishedAt: 2026-02-12
author: qwerty-labs-research
category: Agentic AI
articleType: Engineering guide
tags: [evaluation, reliability, human review]
cover: /journal/figures/agent-evaluation-scorecard.svg
coverAlt: 'An invented evaluation scorecard separates correct autonomous work, incorrect autonomous work, successful human handoffs and unresolved cases.'
evidenceNote: 'The scorecard contains invented cases and the reliability curves are analytical illustrations. Published evaluation practices are attributed to their authors; no chart reports a QWERTY Labs benchmark.'
draft: false
references:
  - id: eval-guide
    title: 'Demystifying evals for AI agents'
    author: 'Anthropic Engineering'
    url: 'https://www.anthropic.com/research/demystifying-evals-for-ai-agents'
    publishedAt: 2026-01-09
  - id: tau-bench
    title: 'τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains'
    author: 'Shunyu Yao, Noah Shinn, Pedram Razavi and Karthik Narasimhan · version 1'
    url: 'https://arxiv.org/abs/2406.12045v1'
    publishedAt: 2024-06-17
  - id: infrastructure-noise
    title: 'Quantifying infrastructure noise in agentic coding evals'
    author: 'Anthropic Engineering'
    url: 'https://www.anthropic.com/research/infrastructure-noise'
    publishedAt: 2026-02-05
---

An agent gives a polished answer: “Your delivery address has been updated.” The tool log shows a timeout. The customer record still contains the old address.

Was the task successful? A grader that reads only the final sentence might say yes. A grader that checks the business system should say no. The difference is the boundary of the evaluation.

Agents need tests that follow the work through to its outcome. Correct wording, valid JSON and plausible tool calls are useful intermediate observations. They are not interchangeable with a completed, authorized task.

## Define success before running the agent

For an address update, success might require a verified account, an allowed change, the exact requested fields in the destination record and a response consistent with that record. An attempted write is not enough.

Write a rubric that also defines acceptable abstention. If the user cannot establish authority over the account, refusing the update can be the correct result. If the system is unavailable, the correct result may be a clearly labelled unresolved request and a useful handoff.

Anthropic's January 2026 evaluation guide distinguishes tasks, trials, graders, traces and outcomes. That separation is useful: the same task can have several attempts, and each attempt can be inspected by several kinds of grader. A transcript is evidence about a run, not automatically its score. <a href="#ref-eval-guide" id="cite-eval-guide" class="citation">[1]</a>

Keep the rubric independent of the agent's own explanation. A model saying that it followed policy cannot be the only evidence that policy was followed.

## Keep the denominators visible

Consider an invented evaluation of five hundred requests. The agent completes 320 correctly without help, completes fifteen incorrectly without help, hands 125 to a person who completes them correctly and leaves forty unresolved.

Autonomous coverage is the fraction the system attempts to finish without a person:

$$
\mathrm{Coverage}=\frac{320+15}{500}=67\%
$$

Error among autonomous outcomes is $15/335\approx4.48\%$. Total correct completion, including the human handoffs, is $(320+125)/500=89\%$. Correct autonomous completion is $320/500=64\%$.

All four percentages describe the same invented population. Reporting only 89% would hide how much work still required a person. Reporting only 67% would hide the incorrect autonomous outcomes.

<figure>
<a href="/journal/figures/agent-evaluation-scorecard.svg" data-figure><img src="/journal/figures/agent-evaluation-scorecard.svg" width="1200" height="750" alt="An illustrative five-hundred-case scorecard contains 320 correct autonomous cases, 15 wrong autonomous cases, 125 completed handoffs and 40 unresolved requests." loading="lazy" /></a>
<figcaption><strong>Figure 1.</strong> An invented evaluation population. Autonomous coverage, accepted quality and assisted completion need separate denominators. <a href="/journal/figures/agent-evaluation-scorecard.csv" download>Download the example counts</a>.</figcaption>
</figure>

Add handling time to the record. A handoff that saves a reviewer ten minutes can still be useful. A handoff containing unsupported conclusions may create more work than a direct manual process.

## Inspect the final state and the path taken

For tasks with a clear system state, compare that state with the expected result. Did the booking change? Was the correct record updated once? Was an unauthorized field left alone?

τ-bench evaluates simulated user interactions involving tools and domain policies, including comparison of final database state with a goal state. It also introduced a repeated-trial reliability measure. Its domains and simulated users set the scope of its findings; passing a related benchmark does not establish production reliability for a new business workflow. <a href="#ref-tau-bench" id="cite-tau-bench" class="citation">[2]</a>

Final-state checks still need path-sensitive rules. A task can reach the right state after an unauthorized read, an unnecessary message or a duplicate action later corrected. Record those failures separately rather than allowing a correct ending to erase them.

For research tasks without one exact answer, use a structured rubric: required coverage, claim support, source quality and explicit treatment of uncertainty. Have reviewers inspect disagreements between automated graders and human judgments.

## Ask whether success is repeatable

A system may solve a task once in five tries while failing most attempts. That can be useful for some offline search problems, but it is a poor description of a customer interaction that gets one attempt.

To see the distinction, assume independent trials with the same success probability $p=0.8$. The probability of at least one success in $k$ trials is $1-(1-p)^k$. The probability that every trial succeeds is:

$$
P(\text{every trial succeeds})=p^k
$$

At five trials, those values are about 99.97% and 32.77%, respectively. These are analytical probabilities under strong assumptions, not measured values for a named agent.

<figure>
<a href="/journal/figures/agent-repeat-reliability.svg" data-figure><img src="/journal/figures/agent-repeat-reliability.svg" width="1200" height="750" alt="Under independent trials with success probability 0.8, at-least-one success rises with additional trials while the probability every trial succeeds falls." loading="lazy" /></a>
<figcaption><strong>Figure 2.</strong> Two different questions about repeated attempts. Real evaluations should estimate their chosen metric from runs and document correlations, task differences and retry rules. <a href="/journal/figures/agent-repeat-reliability.csv" download>Download the calculation data</a>.</figcaption>
</figure>

Do not assume retries are free. Each may consume time, tokens and tool calls. For external writes, a retry also needs safe operation identifiers and reconciliation of uncertain results.

## Control the environment as part of the experiment

An agent that uses tools interacts with a runtime, not just a prompt. Time limits, CPU allocation, network availability, installed packages and tool response shape can change the outcome.

Anthropic's February 2026 report found that infrastructure configuration changed scores in its agentic coding experiments. The general lesson is to document and control the environment; the reported score changes belong to that study's setup. <a href="#ref-infrastructure-noise" id="cite-infrastructure-noise" class="citation">[3]</a>

Store the model identifier, prompt version, tool schemas, application commit and environment configuration with each run. For a database task, start each trial from a known state. Otherwise an earlier attempt may make a later one easier, harder or invalid.

Compare candidate versions on the same tasks. Where services are variable, alternate or randomize execution order rather than running every baseline request during a quiet period and every candidate during peak load.

## Build the test set around actual failure modes

A useful set includes ordinary requests, ambiguous intent, missing information, access restrictions, tool outages and conflicting records. Keep near-duplicate customer conversations out of opposite splits.

| Evaluation layer         | Example check                                     | Limitation                                          |
| ------------------------ | ------------------------------------------------- | --------------------------------------------------- |
| Deterministic validation | Correct record fields and valid schema            | Cannot judge every open-ended answer                |
| Policy checks            | Allowed identity, scope and action                | Need maintained business rules                      |
| Model-based grading      | Supported claims and rubric coverage              | Can inherit grader bias or blind spots              |
| Human review             | Ambiguity, usefulness and important disagreements | Costs time and needs a consistent rubric            |
| Operational observation  | Real completion, handoffs and incidents           | Requires representative traffic and reliable labels |

Keep a stable regression set and a separate exploratory set. If every discovered error is immediately used to tune the prompt, reserve fresh examples for the next independent measurement.

A credible result states what was tested, how success was judged, which cases still needed people and what changed between versions. That makes an agent evaluation useful for an engineering decision, rather than simply another percentage beside a demo.
