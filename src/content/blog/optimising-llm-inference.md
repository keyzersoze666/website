---
title: 'Optimising LLM Inference: Measuring Quality, Latency, Memory and Energy Together'
description: 'A practical framework for evaluating inference efficiency, with published hardware results, worked energy calculations and a benchmark record that keeps comparisons meaningful.'
publishedAt: 2026-07-23
author: qwerty-labs-research
category: Model Research
articleType: Research analysis
tags: [inference, benchmarks, energy, deployment]
cover: /journal/figures/inference-reported-ratios.svg
coverAlt: 'Published approximate benchmark ratios show that a sparse model’s throughput and energy efficiency depend on the device.'
evidenceNote: 'The first chart summarizes approximate ratios reported by the cited authors. The power-versus-energy chart is a separate illustrative calculation. Neither reports a QWERTY Labs hardware experiment.'
draft: false
references:
  - id: evaluation-profile
    title: 'Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile'
    author: 'NIST · AI 600-1'
    url: 'https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence'
    publishedAt: 2024-07-26
  - id: edge-study
    title: 'Does Mixture-of-Experts Actually Help Inference on Consumer and Edge Hardware? An Empirical Study'
    author: 'Alfarizy Alfarizy, Hung Truong Thanh Nguyen, René Richard, Roozbeh Razavi-Far and Hung Cao · preprint, version 3'
    url: 'https://arxiv.org/abs/2606.21428v3'
    publishedAt: 2026-07-09
  - id: mlperf
    title: 'MLPerf Power: Benchmarking the Energy Efficiency of Machine Learning Systems from Microwatts to Megawatts for Sustainable AI'
    author: 'Arya Tschand and colleagues · version 1'
    url: 'https://arxiv.org/abs/2410.12032v1'
    publishedAt: 2024-10-15
---

Two inference configurations complete the same request. One draws 60 watts for four seconds. The other draws 25 watts for twelve seconds. Which uses less energy?

For the simplified constant-power example, the first uses 240 joules and the second uses 300. The lower-power configuration consumes more energy because it runs longer. A single appealing number can hide the trade-off that matters to the application.

The same problem occurs when comparing parameter counts, tokens per second or model-file sizes. Each is useful. None describes the complete cost of delivering a correct result.

## Start with the task and its quality gate

Define the work before choosing the efficiency metric. A document assistant might need to extract specific fields and cite supporting passages. A support agent might need to complete an authorized account update. A generation benchmark might require a fixed distribution of prompt and response lengths.

Set an acceptance threshold that represents that work. Changing precision, context length, model size or routing can change the answer as well as the resource use. A configuration that saves energy by failing the task has not achieved the original objective.

Keep the evaluation set separate from training and prompt tuning. Include examples that are difficult for the intended application, not only those that fit a convenient public benchmark. NIST's Generative AI Profile is a useful reference for evaluating and monitoring systems in their deployment context. <a href="#ref-evaluation-profile" id="cite-evaluation-profile" class="citation">[1]</a>

Where a human judges an output, document the rubric and check agreement across reviewers. A quality percentage is useful only when the reader knows what was judged and how.

## Report four resource dimensions separately

**Latency** measures how long a request waits. Time to first token, or TTFT, describes the delay before generation becomes visible. End-to-end latency measures the completed response. Report distributions, including a high percentile such as p95, rather than only the average.

**Throughput** measures completed work over time. Output tokens per second can describe one generation stream or a whole server; state which. Higher batching can improve aggregate throughput while making an individual request wait longer.

**Memory** includes weights, the KV cache and temporary runtime allocations. Peak allocation and steady-state residency answer different questions. Report which memory tier is measured: accelerator memory, system RAM or an active subset of the model.

**Energy** measures accumulated consumption. Watts describe power, which is a rate. Joules describe energy used over a time interval. To compare useful work, relate that energy to a request, output token or accepted task outcome.

The descriptions belong beside the numbers. A throughput result without a batch size or a memory claim without a tier is difficult to reproduce.

## A sparse model still has a device to satisfy

A 2026 study compared OLMoE-1B-7B with dense baselines on an Apple M2 Pro and an NVIDIA Jetson Orin Nano 8 GB using llama.cpp. The abstract reports that OLMoE throughput was approximately 10% lower than the Llama-3.2-1B comparison on the laptop and 31% lower on the edge device. On the edge device, its energy per token was about 2.1 times the dense comparison. The authors bound their findings to one MoE model at this scale and two devices. <a href="#ref-edge-study" id="cite-edge-study" class="citation">[2]</a>

<figure>
<a href="/journal/figures/inference-reported-ratios.svg" data-figure><img src="/journal/figures/inference-reported-ratios.svg" width="1200" height="750" alt="Approximate author-reported throughput ratios are 0.90 and 0.69 for the two devices; the edge-device energy-per-token ratio is 2.1 against its dense baseline." loading="lazy" /></a>
<figcaption><strong>Figure 1.</strong> Approximate ratios transcribed from the paper's abstract. Each denominator is the dense baseline on the same device. The energy panel refers only to Orin Nano. These are author-reported results, not new QWERTY Labs measurements. <a href="/journal/figures/inference-reported-ratios.csv" download>Download the attributed data</a>.</figcaption>
</figure>

The engineering lesson is to test the claimed advantage on the actual deployment path. Lower arithmetic work per token can coexist with substantial weight movement, cache pressure and scheduling overhead. Hardware that is constrained by memory bandwidth may respond differently from hardware that is constrained by arithmetic throughput.

This does not establish that sparse models are generally inefficient. It establishes that a small active parameter count is insufficient evidence for a particular device-level result.

## Turn a power trace into an energy measurement

If power varies during a request, energy is the area under its power curve:

$$
E=\int_{t_0}^{t_1}P(t)\,dt
$$

$P(t)$ is power in watts and the interval is measured in seconds. The resulting energy $E$ is in joules. For constant power, the expression reduces to $E=P\times T$.

<figure>
<a href="/journal/figures/power-versus-energy.svg" data-figure><img src="/journal/figures/power-versus-energy.svg" width="1200" height="750" alt="An illustrative constant-power calculation shows 60 watts for 4 seconds consuming 240 joules and 25 watts for 12 seconds consuming 300 joules." loading="lazy" /></a>
<figcaption><strong>Figure 2.</strong> A constant-power worked example. It does not compare named processors or measured model configurations. Both alternatives are assumed to complete the same quality-accepted request. <a href="/journal/figures/power-versus-energy.csv" download>Download the calculation data</a>.</figcaption>
</figure>

If both example requests produce 200 output tokens, their energy per output token is:

$$
e_{\mathrm{token}}=\frac{E}{N_{\mathrm{output}}}
$$

The first configuration uses 1.2 joules per output token; the second uses 1.5. These values belong only to the example. With a different input length, output length or quality requirement, the comparison can change.

Output-token normalization is also incomplete for an agent. Two systems may produce different amounts of intermediate text before reaching the same business result. For such a workflow, report energy or cost per **accepted completed task** as well as token-level figures.

## Choose the measurement boundary

A sensor on an accelerator measures a different boundary from a wall meter on the whole machine. A whole-server reading includes CPUs, memory, storage and other services. Either can be useful when its scope is stated.

Idle consumption needs explicit treatment. For an isolated experiment, subtracting a measured idle baseline can estimate incremental energy. For a provisioned service, idle power is still part of the operating bill and may need allocation across the workload. Report the method and, where practical, both views.

Do not use a processor's thermal design power as though it were an observed power trace. Similarly, a device-wide energy counter on a shared server cannot automatically identify one request's contribution. An isolated run or a documented allocation method is required.

MLPerf Power provides a broader methodological reference. Its original paper describes reproducible energy benchmarking across a wide range of systems and workloads. The value for an internal experiment is the attention to measurement rules and comparability, rather than borrowing a headline figure from a different workload. <a href="#ref-mlperf" id="cite-mlperf" class="citation">[3]</a>

## Keep a benchmark record someone else can use

The table below is a reporting template, not a set of results. A model identifier without its revision or a hardware name without its operating conditions leaves important questions open.

<div class="table-wrap">

| Record             | What to specify                                                    |
| ------------------ | ------------------------------------------------------------------ |
| Model and runtime  | Exact revision, inference engine and relevant kernels              |
| Numerical format   | Weight precision, activation format and KV-cache format            |
| Hardware           | Device, RAM/VRAM, power mode and relevant software versions        |
| Workload           | Dataset, prompt-length distribution and output-length limits       |
| Serving conditions | Concurrency, batching and cold/warm-start procedure                |
| Quality            | Acceptance rubric, score, sample size and rejected outcomes        |
| Performance        | TTFT, completed-response latency, percentiles and throughput scope |
| Energy             | Sensor, boundary, sampling method and idle treatment               |

</div>

Use repeated runs and preserve the raw observations. Warm-up, background processes and thermal behavior can influence short measurements. If two configurations differ by less than the variation across runs, describe the uncertainty instead of choosing a winner from one favorable run.

A good comparison also keeps the output requirement fixed. Shortening responses can reduce latency and energy while removing information the user needed. Restricting context may lower memory while causing retrieval or reasoning failures. Treat those changes as different task settings until quality evaluation shows otherwise.

## Optimize within an acceptable operating region

A practical selection process has two stages. First reject configurations that fail essential quality, memory or latency requirements. Then compare the remaining options on the resources that matter to the deployment.

A configuration is dominated when another achieves at least as much of the desired quality while using no more of the resources under comparison, with a strict improvement somewhere. Exploring that frontier is more useful than assuming that one model size or quantization format must be best.

For an enterprise SLM, the useful frontier may favor narrow task accuracy, predictable memory and quick responses. A different application may justify more computation for better reasoning on difficult cases. Both decisions can be sensible when the requirement is explicit.

The result of an optimization study should be a reproducible choice with stated limits: this model, on this runtime and hardware, under this workload, meets this quality target at this resource cost. That is a stronger foundation for deployment than a single unqualified speedup.
