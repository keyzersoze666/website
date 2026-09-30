---
title: 'Billion-Parameter Models on Modest Hardware: Smarter Expert Loading, Caching and Offloading'
description: 'Why a model can exceed working memory yet remain usable, how recent expert-loading research helps, and which storage, latency and quality limits still matter.'
publishedAt: 2026-09-24
author: samvit-labs-research
category: Model Research
articleType: Research review
tags: [inference, mixture-of-experts, memory, caching]
cover: /journal/figures/model-weight-storage.svg
coverAlt: 'A calculated comparison of the ideal weight storage required by a 35-billion-parameter model at different precisions.'
evidenceNote: 'Research results are reported by their original authors. The storage chart is arithmetic, and the loading diagram is conceptual; neither is a SAMVIT Labs hardware benchmark.'
draft: false
references:
  - id: flash-memory
    title: 'LLM in a flash: Efficient Large Language Model Inference with Limited Memory'
    author: 'Keivan Alizadeh and colleagues · ACL 2024'
    url: 'https://arxiv.org/abs/2312.11514v3'
    publishedAt: 2024-07-30
  - id: flashmoe
    title: 'FlashMoE: Reducing SSD I/O Bottlenecks via ML-Based Cache Replacement for Mixture-of-Experts Inference on Edge Devices'
    author: 'Byeongju Kim and colleagues · January 2026 preprint, version 1'
    url: 'https://arxiv.org/abs/2601.17063v1'
    publishedAt: 2026-01-22
  - id: edge0
    title: 'The Other Half of the Memory Wall: Serving 35B MoEs from SSD with Trained Routing Prediction'
    author: 'Yu Lin and colleagues · September 2026 preprint, version 2'
    url: 'https://arxiv.org/abs/2609.18063v2'
    publishedAt: 2026-09-17
---

A large model can fit on a computer's disk and still be impossible to load into its fast working memory. That gap is increasingly interesting. Storage is relatively plentiful; keeping every parameter close to the processor can be expensive.

Recent research explores a different arrangement: keep the full model on storage and bring useful portions into working memory when they are needed. The hard part is arranging those transfers so the processor is not constantly waiting.

This is a systems problem as much as a model problem. Parameter count tells us how much learned capacity exists. It does not tell us how efficiently a particular device can deliver that capacity to an inference engine.

## Count bytes before counting speedups

A parameter is a learned numerical value. If a model contains $N$ parameters and each stored value uses $b$ bits, the ideal weight storage is:

$$
M_w=\frac{Nb}{8}\text{ bytes}
$$

The divisor eight converts bits into bytes. For 35 billion parameters at four bits per value, the arithmetic gives **17.5 GB**, using decimal gigabytes. In binary units, that is approximately **16.3 GiB**. At sixteen bits, the ideal weight storage rises to 70 GB.

<figure>
<a href="/journal/figures/model-weight-storage.svg" data-figure><img src="/journal/figures/model-weight-storage.svg" width="1200" height="750" alt="Calculated ideal storage for 35 billion weights is 70 GB at 16 bits, 35 GB at 8 bits and 17.5 GB at 4 bits." loading="lazy" /></a>
<figcaption><strong>Figure 1.</strong> Ideal weight storage, calculated as parameter count multiplied by bits per weight. These bars exclude quantization scales, metadata and runtime allocations. They do not establish that a particular model preserves its quality at each precision. <a href="/journal/figures/model-weight-storage.csv" download>Download the calculation data</a>.</figcaption>
</figure>

The operating memory requirement is larger. A useful budget separates weights from the **KV cache**, which holds attention information for tokens already processed, and from activations and temporary buffers used during computation. Frameworks, batching and the operating system add further requirements.

This is why a four-bit model file that appears to fit into available memory can still fail during a long conversation. Loading the weights is only the first allocation.

## Sparse computation does not remove stored capacity

In a mixture-of-experts model, or **MoE**, a routing mechanism selects a subset of expert networks for each token. An expert is a learned part of the model that performs a portion of the computation.

Think of a team with several specialists: a request needs only some of them at one moment. The team still needs somewhere to keep every specialist's resources. Similarly, activating fewer experts reduces some computation, but all expert weights must remain available somewhere.

A deployment therefore has two related budgets:

- **Total capacity:** all the model weights that must be stored.
- **Active working set:** the weights and runtime state needed close to the processor for the current work.

Offloading places less immediately useful weights in a slower memory tier, such as system RAM or an SSD. Caching retains weights likely to be reused. Prefetching tries to start a transfer before the computation reaches it. These are distinct techniques, and a working inference system may combine them.

<figure>
<a href="/journal/figures/expert-loading-path.svg" data-figure><img src="/journal/figures/expert-loading-path.svg" width="1200" height="750" alt="A conceptual model-loading pipeline moves selected expert weights from SSD storage into a RAM or VRAM cache and then into execution." loading="lazy" /></a>
<figcaption><strong>Figure 2.</strong> A simplified storage hierarchy. The full model remains stored; the system manages a smaller set near execution. Cache policy, routing and transfer timing determine how much waiting remains.</figcaption>
</figure>

## Why loading strategy matters

Moving data has a lower bound set by transfer volume and available bandwidth:

$$
t_{\mathrm{transfer}}\geq\frac{B_{\mathrm{read}}}{R_{\mathrm{effective}}}
$$

Here, $B_{\mathrm{read}}$ is the number of bytes transferred and $R_{\mathrm{effective}}$ is the sustained bandwidth available to that transfer. Peak bandwidth printed on a device's specification sheet is not necessarily the sustained bandwidth of an application's access pattern.

As an illustrative calculation, a 64 MiB read over an effective 1 GiB/s path needs at least 62.5 milliseconds. Four serialized reads need at least 250 milliseconds before adding computation or other overhead. Many small, scattered reads can perform worse than fewer contiguous reads, even with the same total byte count.

The 2023–2024 **LLM in a flash** work explored this issue for models exceeding available DRAM. It combines reuse of previously activated neurons with larger, more contiguous reads. Its relevance here is the design principle: organize model access around the actual behavior of the storage device. Its reported improvements are relative to the paper's loading baselines, not a universal speedup for every model. <a href="#ref-flash-memory" id="cite-flash-memory" class="citation">[1]</a>

## What the 2026 MoE work adds

**FlashMoE** studies SSD offloading under limited RAM. Its cache policy combines recency and frequency information to improve expert reuse. The January 2026 preprint reports up to a 2.6-fold speedup against the prior MoE inference systems used in its desktop evaluation. That is an author-reported result under the paper's configurations. The January version is the relevant source for this article's date. <a href="#ref-flashmoe" id="cite-flashmoe" class="citation">[2]</a>

**Edge0**, described in September 2026, addresses a different waiting point: an upcoming layer's experts ordinarily depend on an earlier layer's output. Its learned prerouter predicts the routing ahead of execution, and that prediction is used as the routing decision. A recovery adapter addresses some of the resulting quality loss. The authors report serving a 35B MoE at 20 tokens per second with 3 GiB peak active memory on a 24 GB machine. **Three GiB of active memory is not three GiB of total machine memory.** This remains a preprint result, with quality evaluated on the authors' benchmark set. <a href="#ref-edge0" id="cite-edge0" class="citation">[3]</a>

<div class="table-wrap">

| Research direction        | Main intervention                | Question to ask before adopting it               |
| ------------------------- | -------------------------------- | ------------------------------------------------ |
| Flash-aware loading       | Reuse and contiguous transfers   | Does the access pattern match our hardware?      |
| Expert caching            | Keep useful experts nearby       | How does the cache behave under our request mix? |
| Predictive expert routing | Prepare selected experts earlier | What changes in routing quality and evaluation?  |

</div>

These are complementary questions rather than interchangeable benchmark numbers. Comparing one paper's relative speedup directly with another paper's tokens per second would ignore their different hardware, workloads and baselines.

## A cache needs a workload, not just a size

A cache hit occurs when a requested expert is already available in the faster tier. A cache miss requires another transfer. Increasing the cache can improve the hit rate, but that improvement depends on which experts are requested and how often requests revisit them.

A useful experiment should include repeated questions, new topics, long prompts and concurrent users. A demonstration that repeatedly asks similar questions may produce a favorable cache pattern that does not survive a changing business workload.

Cold and warm starts also need separate reporting. A cold start includes loading and initialization before the first useful output. A warm measurement may begin with weights, file pages and runtime state already cached. Both matter; they describe different user experiences.

Concurrency introduces another complication. Two individually efficient requests can compete for the same memory and I/O bandwidth. The best configuration for one local conversation may not be the best configuration for a shared service.

## Decide which constraint to optimize

For a proprietary model program, the deployment target should influence the experiment from the beginning. Record the memory ceiling, context length, simultaneous requests, acceptable response time and task-quality threshold.

Then compare practical alternatives. A smaller dense model may serve a narrow task well. A quantized model may reduce storage and bandwidth requirements, with quality that needs checking. A larger MoE with expert loading may be useful when its additional capacity earns the transfer and operational cost.

The objective is not to force the largest model onto the smallest device. It is to deliver the required quality within a known resource budget. That requires evaluating the whole application, including retrieval and tool use when those are part of the task.

Finally, measure energy separately. Fitting into less fast memory does not prove that a request consumes fewer joules. Storage traffic, longer execution and repeated cache misses can change that result. The companion article on [measuring efficient inference](/blog/optimising-llm-inference/) explains the distinction.

A useful benchmark report makes the trade visible: what stayed on storage, what entered working memory, how quickly an accepted result arrived, and what quality or operating cost changed along the way.
