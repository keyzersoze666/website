---
title: 'Speculative Decoding: Faster Generation While Preserving the Target Distribution'
description: 'How a small draft model and a larger verifier can advance several tokens at once, why correction sampling matters and how to calculate when drafting is worth the overhead.'
publishedAt: 2026-04-16
author: samvit-labs-research
category: Model Research
articleType: Research analysis
tags: [speculative decoding, inference, sampling]
cover: /journal/figures/speculative-decoding-cost.svg
coverAlt: 'An illustrative speculative-decoding model shows speedup changing with draft length, conditional acceptance and verification cost.'
evidenceNote: 'The algorithm discussion refers to exact speculative sampling under its stated assumptions. Timing values and acceptance rates in the chart are invented, not measured speedups or guarantees for a named runtime.'
draft: false
references:
  - id: leviathan
    title: 'Fast Inference from Transformers via Speculative Decoding'
    author: 'Yaniv Leviathan, Matan Kalman and Yossi Matias · version 1'
    url: 'https://arxiv.org/abs/2211.17192v1'
    publishedAt: 2022-11-30
  - id: chen
    title: 'Accelerating Large Language Model Decoding with Speculative Sampling'
    author: 'Charlie Chen and colleagues · version 1'
    url: 'https://arxiv.org/abs/2302.01318v1'
    publishedAt: 2023-02-02
  - id: spec-bench
    title: 'Unlocking Efficiency in Large Language Model Inference: A Comprehensive Survey of Speculative Decoding'
    author: 'Heming Xia and colleagues · Findings of ACL 2024'
    url: 'https://aclanthology.org/2024.findings-acl.456/'
---

A large autoregressive model usually generates a response one token after another. Each new token depends on the prefix already produced, so generation has a sequential component that is difficult to remove.

But many continuations are predictable enough for a smaller model to propose. Speculative decoding uses that observation: draft several tokens cheaply, then ask the larger target model to verify them with a more parallel computation.

The interesting part is not simply accepting words that look plausible. An exact sampling algorithm must preserve the target model's probability distribution while deciding which proposals to keep.

## Separate proposing from deciding

Let the draft model propose a short continuation. The target model evaluates the probabilities along that proposed sequence. A verification pass can score several positions together even though drafting those positions happened sequentially.

Leviathan, Kalman and Matias introduced a speculative-decoding method that uses an approximation model and a correction procedure to preserve the target distribution. Its reported speedups apply to its tested models and implementation. The general opportunity is to replace some sequential target calls with cheaper drafts and parallel verification. <a href="#ref-leviathan" id="cite-leviathan" class="citation">[1]</a>

The target still decides the accepted distribution. The draft is useful when it is both inexpensive and sufficiently aligned with the target on the current task.

## Why probability correction is necessary

At one position, let $p(x)$ be the target probability of token $x$ and $q(x)$ its draft probability, both conditioned on the same accepted prefix. The draft samples a token from $q$.

One exact acceptance rule is:

$$
a(x)=\min\left(1,\frac{p(x)}{q(x)}\right)
$$

For a token sampled from the draft, $q(x)$ is positive. If the token is rejected, the replacement is sampled from a normalized residual distribution:

$$
p_{\mathrm{corr}}(x)=
\frac{\max(p(x)-q(x),0)}{\sum_y\max(p(y)-q(y),0)}
$$

Intuitively, rejection corrects the parts of the draft distribution that were overrepresented and draws from the target mass that remains underrepresented. The full algorithm also specifies when verification stops, which draft suffix is discarded and what happens when every proposed token is accepted.

Chen and colleagues present a speculative-sampling formulation that preserves the target distribution within hardware numerics. The correction rule is essential; replacing it with an arbitrary “close enough” test is a different method with a different quality claim. <a href="#ref-chen" id="cite-chen" class="citation">[2]</a>

<figure>
<a href="/journal/figures/speculative-decoding-round.svg" data-figure><img src="/journal/figures/speculative-decoding-round.svg" width="1200" height="750" alt="A conceptual speculative-sampling round accepts draft tokens A and B, rejects C, samples replacement X from the correction distribution and discards the remaining draft token D." loading="lazy" /></a>
<figcaption><strong>Figure 1.</strong> An illustrative rejection round. The letters stand for arbitrary tokens. After a rejection, later draft tokens were conditioned on a prefix that was not accepted and must be discarded.</figcaption>
</figure>

Preserving a distribution does not mean that two separately seeded runs must print identical text. The claim concerns the sampling process. Tokenization, probability transformations, implementation details and numerical precision must be accounted for when establishing what a runtime preserves.

## Estimate how many tokens a round advances

Suppose each proposed token has the same conditional acceptance probability $\alpha$ given acceptance of the earlier proposals. Let $k$ be the draft length. In the simplified exact scheme, a round advances at least one token, with an additional token possible for each accepted proposal, including a target bonus when all proposals are accepted.

The expected number advanced is:

$$
\mathbb{E}[N]=1+\alpha+\alpha^2+\cdots+\alpha^k
=\frac{1-\alpha^{k+1}}{1-\alpha}
$$

For $\alpha=0.75$ and three draft tokens, the expectation is about 2.734 tokens per round. That is a calculation under a constant-acceptance approximation. Real acceptance depends on the task, prefix, sampling settings and model pair.

Expected tokens per round is not yet speedup. The round includes draft generation, target verification and scheduling overhead.

## Compare the work saved with the work added

Use an invented normalized timing model. Baseline target decoding costs one time unit per token. A verification pass costs $1+0.1(k-1)$ units, while drafting costs $0.1k$ units. The combined round cost is therefore $0.9+0.2k$.

An approximate speedup under these assumptions is expected tokens advanced divided by round cost. At $\alpha=0.75$ and $k=3$, it is $2.734/1.5\approx1.82$.

<figure>
<a href="/journal/figures/speculative-decoding-cost.svg" data-figure><img src="/journal/figures/speculative-decoding-cost.svg" width="1200" height="750" alt="Under invented normalized timing assumptions, speculative-decoding speedup depends on acceptance probability and draft length, with extra drafting eventually offsetting gains." loading="lazy" /></a>
<figcaption><strong>Figure 2.</strong> An illustrative cost model, not a hardware benchmark. The draft and verification costs are assumptions. A value below one means slower generation than the stated baseline. <a href="/journal/figures/speculative-decoding-cost.csv" download>Download the calculation data</a>.</figcaption>
</figure>

A longer draft can become counterproductive because the model spends time producing a suffix that is often rejected. A very accurate draft may still be too expensive. Conversely, a cheap draft that accepts often on structured text may perform poorly on another domain.

The practical draft length may also change under load. Target verification that is cheap for one request can compete with other batched requests for compute and memory.

## Evaluate the workload, not only the model pair

Xia and colleagues' survey introduces Spec-Bench to examine speculative decoding across several generation settings. That broader evaluation is useful because draft acceptance and useful speedup can vary by task. A single short completion is insufficient evidence for a general serving claim. <a href="#ref-spec-bench" id="cite-spec-bench" class="citation">[3]</a>

Test the prompt and output lengths that the application uses. Include structured extraction, ordinary prose and domain-specific terminology when they are relevant. Record sampling settings and stop conditions so the comparison does not quietly change the workload.

| Measurement                  | What to report                                         |
| ---------------------------- | ------------------------------------------------------ |
| Accepted draft tokens        | Distribution by task and prefix length                 |
| Draft and verification time  | Separates extra work from saved target calls           |
| Decode latency               | Time per generated token and full completion           |
| Time to first useful output  | Captures startup and prefill effects                   |
| Memory and concurrency       | Includes both models and their state                   |
| Distribution and task checks | Establishes what the implementation actually preserves |

Compare against a well-configured target-only baseline using the same runtime where possible. Otherwise a speedup may reflect different kernels or batching rather than the speculative algorithm itself.

## Keep exact and approximate methods distinct

Some acceleration techniques accept a change in the output distribution in exchange for additional speed. Those methods can be useful, but they need task-quality evaluation rather than inheriting the guarantee of exact speculative sampling.

Even an exact decoder should be tested as deployed. Bugs in masks, cache positions, sampling transforms or correction code can invalidate the intended algorithm. Passing a few qualitative prompts cannot establish distributional equivalence.

Speculative decoding is most promising when the draft is cheap, the target can verify efficiently and the workload supplies enough accepted proposals to repay the overhead. Its value comes from a measured serving configuration with a precise correctness claim, not from draft length alone.
