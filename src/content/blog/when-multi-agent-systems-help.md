---
title: 'Multi-Agent Systems: When Specialisation Helps and When It Adds Cost'
description: 'How to identify genuinely parallel agent work, budget coordination overhead and keep evidence, verification and external actions under clear ownership.'
publishedAt: 2026-07-03
author: qwerty-labs-research
category: Agentic AI
articleType: Research analysis
tags: [multi-agent systems, orchestration, reliability]
cover: /journal/figures/multi-agent-parallelism.svg
coverAlt: 'An illustrative speedup curve peaks at four parallel workers as coordination overhead grows with each additional worker.'
evidenceNote: 'Published observations are attributed to their authors. The parallelism curve is a hypothetical analytical model, and the architecture is a proposed blueprint rather than a measured QWERTY Labs system.'
draft: false
references:
  - id: anthropic-research
    title: 'How we built our multi-agent research system'
    author: 'Anthropic Engineering'
    url: 'https://www.anthropic.com/research/multi-agent-research-system'
    publishedAt: 2025-06-13
  - id: mas-failures
    title: 'Why Do Multi-Agent LLM Systems Fail?'
    author: 'Mert Cemri and colleagues · version 1'
    url: 'https://arxiv.org/abs/2503.13657v1'
    publishedAt: 2025-03-17
  - id: effective-agents
    title: 'Building effective agents'
    author: 'Erik Schluntz and Barry Zhang · Anthropic'
    url: 'https://www.anthropic.com/research/building-effective-agents'
    publishedAt: 2024-12-19
---

Imagine preparing a supplier assessment. One stream checks technical specifications, another examines delivery records and a third searches for contradictory evidence. The streams can work independently before a reviewer combines their findings.

Now imagine changing a customer's delivery address. Identity verification must precede authorization, which must precede the update. Splitting these steps among agents does not remove the dependency. It adds handoffs to a process that still needs a controlled order.

Both can be called agentic systems. Only the first example has an obvious opportunity for parallel research. The architecture should follow that difference.

## Give each worker a reason to exist

A useful agent role has a bounded objective, an allowed tool set, an output contract and a stopping condition. A title such as “senior strategist” does not provide any of those.

For supplier research, a worker might return three supported findings about a specific component, with source URLs, relevant excerpts, publication dates and unresolved contradictions. The worker stops after its evidence budget is used. Another worker examines a separate part of the assessment.

Anthropic's June 2025 account describes a coordinator-and-worker research system. It reports substantial token use: roughly fifteen times a chat interaction for its multi-agent workloads. That is a workload-specific observation, not a universal multiplier, but it makes the economic question concrete. Parallel research can consume more total work even when elapsed time falls. <a href="#ref-anthropic-research" id="cite-anthropic-research" class="citation">[1]</a>

Before adding workers, ask whether one agent with well-designed tools could collect the same evidence within the available context and time. Use that simpler version as the comparison baseline.

## Estimate the part that can run in parallel

Consider an invented task taking twenty minutes in a sequential implementation. Assume six minutes are inherently serial and fourteen minutes can be divided equally across workers. Add coordination overhead equal to 4% of the original task time for each extra worker.

For $k$ workers, relative elapsed time is:

$$
\frac{T(k)}{T(1)}=0.30+\frac{0.70}{k}+0.04(k-1)
$$

The first term is serial work. The second is parallel work divided among workers. The third is our assumed overhead. At four workers, relative time is 0.595, so elapsed time is 11.9 minutes and speedup is about 1.68 times.

<figure>
<a href="/journal/figures/multi-agent-parallelism.svg" data-figure><img src="/journal/figures/multi-agent-parallelism.svg" width="1200" height="750" alt="An invented parallelism model with 30 percent serial work and rising coordination overhead reaches about 1.68 times speedup at four workers and then declines." loading="lazy" /></a>
<figcaption><strong>Figure 1.</strong> An overhead-aware calculation, not a measured agent benchmark. The best worker count follows from the chosen assumptions. Real tasks can have uneven work, rate limits and more complex overhead. <a href="/journal/figures/multi-agent-parallelism.csv" download>Download the calculation data</a>.</figcaption>
</figure>

Adding workers beyond four makes this particular example slower. Even without overhead, the serial component limits the benefit. With variable worker durations, the slowest required result can determine when synthesis starts.

Measure elapsed time and total consumed resources separately. Four workers each spending ten seconds are not equivalent to one worker spending ten seconds in compute, tokens or tool requests.

## Decide how evidence moves between agents

A worker's output should be a compact evidence record. Passing a long conversation transcript to the next agent transfers irrelevant history, consumes context and makes source tracking harder.

For each finding, keep the claim, source identifier, location within the source and uncertainty. Preserve direct access to the original material so the verifier can check it. The coordinator should know whether two workers independently found evidence or merely repeated the same source.

<figure>
<a href="/journal/figures/multi-agent-evidence.svg" data-figure><img src="/journal/figures/multi-agent-evidence.svg" width="1200" height="750" alt="A coordinator sends bounded technical, operational and contradictory-evidence searches to three workers that return findings to one verifier and synthesizer." loading="lazy" /></a>
<figcaption><strong>Figure 2.</strong> An illustrative evidence-gathering design. The final record has one owner, while external actions use a separate authorization path.</figcaption>
</figure>

A shared database can hold references and status without forcing every worker to read every intermediate message. Define who may edit a finding, how conflicts are recorded and which version the final report used. Concurrent writes need ordinary application controls, even when their authors are language models.

## Keep one owner for external actions

Research can often be parallelised safely because collecting an additional document does not commit the business to a transaction. Updating a record, sending a message or releasing a payment is different.

Assign a single controlled execution path to each action. Workers can propose changes, but the application verifies identity, permissions, policy and the current record before submitting them. Use an action identifier and reconcile the result before attempting another write.

This prevents a common coordination error: two agents independently decide that the same action is the next useful step. Their intentions may agree while their duplicate writes still damage the workflow.

An “unknown” result also needs an owner. If a tool times out after submitting a request, another worker should not infer that nothing happened. Query the operation state and decide what to do from evidence.

## Test disagreement, dead ends and termination

Cemri and colleagues studied failures in multi-agent frameworks and organised them into categories covering system design, inter-agent alignment and verification or termination. Their analysis supports testing the collaboration itself, not only the reasoning of each model. It does not imply that every architecture fails in the same way. <a href="#ref-mas-failures" id="cite-mas-failures" class="citation">[2]</a>

Create evaluation cases where a worker returns no useful result, two sources disagree, a tool fails midway and a result arrives after the coordinator's deadline. The correct system behaviour might be a partial report with explicit gaps rather than an endless attempt to produce a complete-looking answer.

Set budgets for wall-clock time, tool calls, tokens and retries. When a worker exhausts a budget, it should report what it found and what remains unknown. The coordinator also needs a stopping rule; otherwise synthesis can trigger another round of research whenever it notices a gap.

## Compare complete systems on the same work

A fair test holds the task set, tool access and acceptance rubric constant. If the multi-agent version receives more time and a larger token budget, report that difference. Otherwise improved quality can be mistaken for an architectural advantage when it came from simply spending more resources.

| Measurement           | What to compare                                   |
| --------------------- | ------------------------------------------------- |
| Accepted task outcome | Supported findings and required coverage          |
| Elapsed time          | Start to verified final result, including retries |
| Resource cost         | Total model tokens, tool calls and compute        |
| Duplication           | Repeated searches and overlapping findings        |
| Coordination failures | Lost context, contradictory actions and deadlocks |
| Recovery              | Useful completion after a worker or tool fails    |

Anthropic's earlier guide distinguishes predefined workflows from agents that choose their own steps, and recommends starting with simple composable patterns. Use that as an architectural baseline: a fixed parallel workflow may solve a known task without giving every worker open-ended planning authority. <a href="#ref-effective-agents" id="cite-effective-agents" class="citation">[3]</a>

For a first pilot, choose one task with truly separable evidence streams. Keep the final decision and action ownership explicit. Expand only when the extra workers produce a measured improvement in accepted outcomes or elapsed time that justifies their cost. The number of agents is an implementation detail; the quality of the completed work is the result the business receives.
