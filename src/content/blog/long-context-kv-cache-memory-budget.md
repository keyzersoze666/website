---
title: 'Long Context on a Memory Budget: KV Caches, Paging and Prefix Reuse'
description: 'Why attention state can outgrow model weights, how to calculate a realistic cache budget and what paging, grouped-query attention and cache quantisation actually change.'
publishedAt: 2026-03-27
author: qwerty-labs-research
category: Model Research
articleType: Engineering guide
tags: [KV cache, long context, memory efficiency]
cover: /journal/figures/kv-cache-budget.svg
coverAlt: 'An analytical chart shows KV-cache storage increasing with context length and the number of concurrent sequences for a hypothetical architecture.'
evidenceNote: 'Memory values are ideal arithmetic for an explicitly hypothetical model architecture. They exclude weights, allocator overhead and temporary buffers, and do not report a measured deployment.'
draft: false
references:
  - id: gqa
    title: 'GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints'
    author: 'Joshua Ainslie and colleagues · version 1'
    url: 'https://arxiv.org/abs/2305.13245v1'
    publishedAt: 2023-05-22
  - id: paged-attention
    title: 'Efficient Memory Management for Large Language Model Serving with PagedAttention'
    author: 'Woosuk Kwon and colleagues · version 1'
    url: 'https://arxiv.org/abs/2309.06180v1'
    publishedAt: 2023-09-12
  - id: kivi
    title: 'KIVI: A Tuning-Free Asymmetric 2bit Quantization for KV Cache'
    author: 'Zirui Liu and colleagues · version 1'
    url: 'https://arxiv.org/abs/2402.02750v1'
    publishedAt: 2024-02-05
---

A compressed model fits comfortably in accelerator memory. Then four users submit long documents at once, and the server runs out of space. The weight file did not change. The attention state did.

Many autoregressive transformers retain keys and values from earlier tokens so that generation can reuse them. This stored state is called the KV cache. It grows with retained context and the number of active sequences, which makes it a separate deployment budget from model weights.

Understanding that budget helps distinguish several useful techniques that are often grouped together under “memory optimisation.” Some reduce how much state exists. Others manage the same state more efficiently.

## Count what the architecture stores

For a simplified decoder with equal key and value dimensions, an ideal cache estimate is:

$$
M_{\mathrm{KV}}=2L H_{\mathrm{KV}}D T B s
$$

$L$ is the number of layers, $H_{\mathrm{KV}}$ the number of key/value heads, $D$ the head dimension, $T$ the cached tokens per sequence, $B$ the number of equal-length concurrent sequences and $s$ the bytes per stored value. The leading two accounts for both keys and values.

Take a hypothetical configuration with thirty-two layers, eight KV heads, a head dimension of 128 and two bytes per value. One sequence with 32,768 cached tokens requires 4 GiB of ideal cache storage. Four such sequences require 16 GiB.

These are binary gibibytes, where one GiB is $2^{30}$ bytes. The figures exclude model weights, allocation overhead and temporary tensors. A real runtime can reserve more memory than the live values occupy.

<figure>
<a href="/journal/figures/kv-cache-budget.svg" data-figure><img src="/journal/figures/kv-cache-budget.svg" width="1200" height="750" alt="For a hypothetical architecture, one sequence needs four GiB of KV cache at 32768 tokens while four equal-length concurrent sequences need sixteen GiB." loading="lazy" /></a>
<figcaption><strong>Figure 1.</strong> Ideal cache arithmetic for the stated architecture. “k” means 1,024 tokens. Context means all retained tokens, including generated output. No named model or hardware measurement is represented. <a href="/journal/figures/kv-cache-budget.csv" download>Download the calculation data</a>.</figcaption>
</figure>

For unequal sequence lengths, replace $BT$ with the sum of their retained token counts. Models with sliding windows, different layer types or compressed state require an architecture-specific calculation rather than this simple expression.

## Distinguish query heads from KV heads

A model can have more query heads than key/value heads. Grouped-query attention shares KV heads among groups of queries, reducing the amount of stored state relative to a comparable full multi-head arrangement.

The GQA paper studies this architectural trade-off and an uptraining approach for existing checkpoints. Its result is not a runtime switch that lets any model discard KV heads without changing its computation. The architecture and trained weights determine what the model needs. <a href="#ref-gqa" id="cite-gqa" class="citation">[1]</a>

In the hypothetical configuration above, substituting thirty-two KV heads for eight would multiply ideal cache storage by four. That arithmetic explains the memory difference; it does not predict equal quality between two differently trained architectures.

Read the configuration rather than estimating KV heads from the model's total parameter count. Models with similar weight sizes can have different cache requirements.

## Paging reduces allocation waste

A naive serving system might reserve one large contiguous region for a sequence's maximum length. Real requests finish at different lengths, leaving space that other requests cannot use efficiently.

PagedAttention maps logical cache blocks to physical storage blocks, drawing on ideas from virtual memory. The paper presents this approach within vLLM to reduce fragmentation and support flexible sharing. It changes allocation and access; it does not eliminate the bytes needed for retained keys and values. <a href="#ref-paged-attention" id="cite-paged-attention" class="citation">[2]</a>

<figure>
<a href="/journal/figures/kv-cache-pages.svg" data-figure><img src="/journal/figures/kv-cache-pages.svg" width="1200" height="750" alt="A conceptual paged cache maps logical blocks for two sequences through separate block tables to noncontiguous physical blocks." loading="lazy" /></a>
<figcaption><strong>Figure 2.</strong> A conceptual block mapping. Block identifiers are arbitrary and do not represent measured addresses or a particular implementation's page size.</figcaption>
</figure>

Block size introduces its own trade-off. Larger blocks can simplify management but leave more unused space in a final partially filled block. Smaller blocks can reduce that waste while increasing metadata and scheduling work. Measure the chosen implementation under the actual distribution of request lengths.

## Prefix reuse saves repeated work under specific conditions

Many requests begin with the same system instructions or document prefix. If a serving engine supports prefix caching, it can reuse compatible computed state instead of processing that prefix again from scratch.

Compatibility is stricter than similar-looking text. Tokenization, exact prefix tokens, model and adapter version, position handling and relevant runtime settings must agree. A cache from a different model version is not a valid shortcut.

Authorization also belongs in the cache design. A shared prefix containing one tenant's private records must not become reusable context for another tenant. Use explicit scope and isolation rules; semantic similarity is not a permission check.

Prefix reuse mainly helps repeated prefill work. It does not remove the cost of generating a unique answer or storing a unique suffix. Report cold and warm cache results separately so a benchmark reflects the request pattern the application will actually see.

## Cache quantisation changes representation

Weight quantisation and KV-cache quantisation address different arrays. A four-bit weight format can still use a higher-precision cache.

KIVI studies low-bit cache quantisation with different treatment for keys and values. Its design reflects their different numerical patterns, including the handling of outliers. The paper's two-bit label does not mean every runtime allocation is one-eighth of a sixteen-bit baseline: metadata, residual regions and implementation choices still matter. <a href="#ref-kivi" id="cite-kivi" class="citation">[3]</a>

Evaluate long-context tasks after changing cache precision. Include information near the beginning, middle and end of the input, multiple similar identifiers and generation lengths typical of the application. A short prompt test does not exercise the state that a long document creates.

## Manage admission as well as representation

Even an efficient cache has a finite budget. A server needs a policy for how many sequences and tokens it admits at once. A maximum context length advertised by the model is not a promise that every concurrent user can use that length on the chosen hardware.

Reserve room for generated tokens and runtime peaks. Decide whether an oversized request is rejected, queued or routed elsewhere. Silent truncation is dangerous when the missing part contains the answer or an important instruction.

| Measurement                          | Why to record it                                      |
| ------------------------------------ | ----------------------------------------------------- |
| Live cached tokens                   | Explains state growth across requests                 |
| Reserved and occupied cache bytes    | Separates allocation from useful state                |
| Prompt and output lengths            | Makes workload comparisons meaningful                 |
| Cold and warm prefill latency        | Exposes the effect of prefix reuse                    |
| Completion latency under concurrency | Shows user-visible queueing and generation delay      |
| Long-context task quality            | Checks that memory savings preserve the required work |

Report weights, cache and other memory separately when the runtime allows it. Include the precision, architecture, engine version and admission limits with the result.

A practical memory optimisation is one that increases useful workload capacity while keeping the required answers correct. The weight file is only the first item in that calculation; retained attention state often determines what happens when real users arrive together.
