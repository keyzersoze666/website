---
title: 'Measuring Agentic AI ROI: Cycle Time, Accuracy and Cost per Completed Task'
description: 'A worked example of the business case for an AI agent: count review and exceptions, separate capacity from cash savings, and measure the whole process.'
publishedAt: 2026-08-27
author: samvit-labs-research
category: Agentic AI
articleType: Worked example
tags: [agents, evaluation, operations, ROI]
cover: /journal/figures/roi-weekly-cost.svg
coverAlt: 'An illustrative comparison of weekly handling costs before and after an agent-assisted workflow.'
evidenceNote: 'The financial example and sensitivity charts are illustrative calculations, not a customer case study. External research is attributed and its limits are stated.'
draft: false
references:
  - id: metr-2025
    title: 'Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity'
    author: 'Joel Becker, Nate Rush, Beth Barnes and David Rein · METR'
    url: 'https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/'
    publishedAt: 2025-07-10
  - id: metr-update
    title: 'We are Changing our Developer Productivity Experiment Design'
    author: 'Joel Becker and colleagues · METR'
    url: 'https://metr.org/blog/2026-02-24-uplift-update/'
    publishedAt: 2026-02-24
  - id: little
    title: 'A Proof for the Queuing Formula: L = λW'
    author: 'John D. C. Little · Operations Research, 1961'
    url: 'https://doi.org/10.1287/opre.9.3.383'
  - id: nist-profile
    title: 'Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile'
    author: 'NIST · AI 600-1'
    url: 'https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence'
    publishedAt: 2024-07-26
---

An agent prepares an invoice in forty seconds. A person previously spent twenty-four minutes on it. Is that a thirty-six-fold improvement?

Only if preparing the invoice was the entire job. Someone may still need to find the purchase order, inspect a discrepancy, approve the payment and repair an incorrect entry. The forty seconds measures one activity. The business buys an outcome.

That distinction is where a useful return-on-investment calculation begins. We need to follow a case from arrival to an accepted result, including the work that automation leaves behind.

## Start with a completed case

Choose a unit that the operations team already recognizes: an invoice approved, a support request resolved, or an account opened correctly. Define its acceptance criteria before running a pilot.

For an invoice, those criteria might include matching the supplier, amount, tax treatment and purchase-order reference, then creating the correct record in the finance system. A plausible-looking draft is an intermediate state. A duplicate payment is a failed outcome even if the agent produced it quickly.

Record three different clocks:

- **Handling time:** the minutes people actively spend on a case.
- **Elapsed cycle time:** the time between arrival and completion, including queues and approvals.
- **Machine execution time:** the time consumed by model inference and tool calls.

These clocks answer different questions. Shortening the third can leave the first almost unchanged. Shortening the first can free capacity while an approval queue continues to dominate the second.

## A worked weekly example

Consider a hypothetical team processing **1,000 invoices a week**. The baseline requires **24 minutes of human handling per invoice**. Loaded labor costs **\$30 per hour**. These are assumptions chosen for the calculation, not observations from a client.

In an assisted workflow, routine invoices require seven minutes of checking and approval. Twenty percent need exception handling, taking thirty-five minutes each. That exception time includes the review and repair work; it is not an extra thirty-five minutes added to the routine path.

<div class="table-wrap">

| Measure                            |             Baseline | Assisted workflow |
| ---------------------------------- | -------------------: | ----------------: |
| Weekly volume                      |          1,000 cases |       1,000 cases |
| Routine handling time              |               24 min |             7 min |
| Exception handling time            | Included in baseline |            35 min |
| Assisted exception share           |                    — |               20% |
| Total human handling               |            400 hours |         210 hours |
| Human handling cost                |             \$12,000 |           \$6,300 |
| AI, operations and amortized setup |                    — |           \$1,400 |
| Total weekly cost                  |             \$12,000 |           \$7,700 |

</div>

The expected assisted handling time is a weighted average:

$$
\bar t_a=(1-p)t_r+p t_e
$$

Here, $p$ is the fraction of exceptions, $t_r$ is routine handling time and $t_e$ is exception handling time. All times use minutes. Substituting the assumptions gives:

$$
\bar t_a=0.8(7)+0.2(35)=12.6\text{ minutes}
$$

For 1,000 cases, that is 12,600 minutes, or 210 hours. The team releases **190 hours of weekly handling capacity**. Dividing the baseline time by the assisted time gives $24/12.6\approx1.90$. This is a handling-capacity ratio for the assumed case mix. It does not predict a 1.90-fold reduction in customer waiting time.

<figure>
<a href="/journal/figures/roi-weekly-cost.svg" data-figure><img src="/journal/figures/roi-weekly-cost.svg" width="1200" height="750" alt="Illustrative weekly cost decreases from 12000 dollars to 7700 dollars, including 1400 dollars of operating and amortized setup costs." loading="lazy" /></a>
<figcaption><strong>Figure 1.</strong> A calculated weekly cost comparison using the assumptions above. All amounts are illustrative USD values. Human review remains a substantial part of the assisted workflow. <a href="/journal/figures/roi-weekly-cost.csv" download>Download the calculation data</a>.</figcaption>
</figure>

## Turn capacity into an economic estimate

The released hours have an accounting value of $190\times30=5700$ in USD. Subtracting the assumed \$1,400 weekly cost leaves **\$4,300 of net weekly benefit**.

For this example, define the weekly return relative to the new system's cost:

$$
\mathrm{ROI}=\frac{\text{gross benefit}-\text{system cost}}{\text{system cost}}
=\frac{5700-1400}{1400}\approx307\%
$$

That percentage depends on how we account for setup. The \$1,400 includes an illustrative \$200 for inference, \$200 for operations and \$1,000 of setup cost allocated to each week. It is neither a vendor price nor a financing calculation. A project proposal should also show the actual upfront outlay, allocation period and payback date.

Most importantly, **capacity is not automatically cash savings**. If payroll stays the same, the immediate gain may be the ability to handle more volume, clear a backlog or avoid additional hiring. Cash savings require an actual change in expenditure. Describe which benefit is expected and who can realize it.

## Exceptions can consume the apparent gain

Routine paths make good demonstrations. Exceptions often determine the business case.

Keep the same seven-minute routine path and thirty-five-minute exception path. Increasing the exception share from 20% to 40% changes average handling time from 12.6 to 18.2 minutes. The capacity ratio falls from about 1.90 to 1.32. The model can be equally fast in both situations; the surrounding process produces a different result.

<figure>
<a href="/journal/figures/roi-exception-sensitivity.svg" data-figure><img src="/journal/figures/roi-exception-sensitivity.svg" width="1200" height="750" alt="A calculated curve shows handling-capacity improvement falling as more cases require exception handling." loading="lazy" /></a>
<figcaption><strong>Figure 2.</strong> Sensitivity to the exception share, holding the three handling-time assumptions fixed. The horizontal line marks equal baseline and assisted handling time. It does not include operating costs. <a href="/journal/figures/roi-exception-sensitivity.csv" download>Download the calculation data</a>.</figcaption>
</figure>

In the financial example, \$1,400 spread over 1,000 cases is \$1.40 per case. At \$0.50 per labor minute, this is equivalent to another 2.8 minutes. Cost breaks even when $7+28p+2.8=24$, or at roughly **50.7% exceptions**, under these assumptions. That threshold is a useful question for a pilot: can the proposed workflow stay comfortably below it while meeting its quality requirements?

## Measure quality and time together

Time saved on an incorrect result is not a completed benefit. Track accepted completion, reopened cases, incorrect downstream changes and the severity of errors. Record review effort even when the reviewer accepts the first suggestion.

A 2025 METR randomized study illustrates why measurement matters. In its specific setting—16 experienced open-source developers working on 246 tasks—access to the studied AI tools increased completion time by 19%. This is evidence about that experiment, not a forecast for invoice processing or every later model. <a href="#ref-metr-2025" id="cite-metr-2025" class="citation">[1]</a>

METR's February 2026 follow-up also matters: the researchers reported selection effects that made their newer productivity estimates unreliable. A changing model landscape and a changing participant pool can complicate comparison. <a href="#ref-metr-update" id="cite-metr-update" class="citation">[2]</a>

For a business pilot, randomly assign comparable cases where feasible, or use a carefully matched comparison group. Keep seasonal volume, case complexity and staffing differences visible. Report the sample size and an interval around the estimated improvement. A single average without its variation can conceal an expensive tail of repairs.

## Keep waiting time visible

Suppose an approval queue holds an average of 36 cases and completes eight per hour. For a stable system, Little's Law relates average work in progress $L$, throughput $\lambda$ and time in the system $W$: <a href="#ref-little" id="cite-little" class="citation">[3]</a>

$$
L=\lambda W,\qquad W=36/8=4.5\text{ hours}
$$

This is a relationship between long-run averages, with a consistent system boundary. It does not assume that every case waits exactly four and a half hours. Nor does it tell us that reducing model latency will increase the queue's completion rate.

If a person approves the queue only twice daily, a faster drafting step may do little for elapsed cycle time. Moving the approval point, changing staffing or improving the information attached to each request may be the more valuable intervention.

## Make the pilot answer a decision

Before deployment, agree on the minimum acceptable quality, the cost ceiling and the rollback conditions. The NIST Generative AI Profile is a useful reference for treating evaluation and monitoring as ongoing work rather than a launch-day exercise. <a href="#ref-nist-profile" id="cite-nist-profile" class="citation">[4]</a>

A useful pilot report should let an operations lead answer: How many cases finished correctly? How much human work remained? Which cases became harder? What changed in expenditure or usable capacity?

Those answers support a defensible improvement claim. A multiplication sign belongs in the headline only after its numerator, denominator and scope are clear.
