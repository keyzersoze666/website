---
title: 'Quantisation Without Guesswork: What 4-Bit Models Save and What to Measure'
description: 'A plain-language explanation of quantisation, group metadata and calibration, with reproducible storage arithmetic and a practical quality-testing plan.'
publishedAt: 2026-02-26
author: qwerty-labs-research
category: Model Research
articleType: Research review
tags: [quantisation, compression, inference]
cover: /journal/figures/quantisation-metadata.svg
coverAlt: 'A storage chart separates four-bit weight payload from group metadata for an analytical eight-billion-parameter model.'
evidenceNote: 'The quantiser and storage format in the figures are deliberately simplified analytical examples. They do not reproduce AWQ, GPTQ or a measured production model format.'
draft: false
references:
  - id: awq
    title: 'AWQ: Activation-aware Weight Quantization for On-Device LLM Compression and Acceleration'
    author: 'Ji Lin and colleagues · MLSys 2024'
    url: 'https://proceedings.mlsys.org/paper_files/paper/2024/hash/42a452cbafa9dd64e9ba4aa95cc1ef21-Abstract-Conference.html'
  - id: gptq
    title: 'GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers'
    author: 'Elias Frantar, Saleh Ashkboos, Torsten Hoefler and Dan Alistarh · version 1'
    url: 'https://arxiv.org/abs/2210.17323v1'
    publishedAt: 2022-10-31
  - id: smoothquant
    title: 'SmoothQuant: Accurate and Efficient Post-Training Quantization for Large Language Models'
    author: 'Guangxuan Xiao and colleagues · version 1'
    url: 'https://arxiv.org/abs/2211.10438v1'
    publishedAt: 2022-11-18
---

An eight-billion-parameter model needs sixteen decimal gigabytes if every weight occupies sixteen bits. Store each weight in four bits and the ideal payload falls to four gigabytes. That is an attractive starting point for running useful models on more modest hardware.

The word _ideal_ matters. Real formats include scales, packing rules and sometimes higher-precision tensors. Running the model also needs memory for attention state, intermediate values and software buffers. Four-bit weights describe one part of the deployment, not the size of the whole process.

Quantisation is best treated as an engineering change with a quality budget. The aim is to reduce resource use while preserving the behaviour the application needs.

## Replace many possible values with a smaller set

A trained weight is a number that helps determine the model's output. Quantisation represents that number using a smaller set of possible values. A scale tells the runtime how to interpret the stored code.

For a toy example, take weights between minus one and one. Set a scale $s=1/7$, round to an integer code and reconstruct the value:

$$
q=\operatorname{clip}\left(\operatorname{round}(w/s),-7,7\right),
\qquad \hat{w}=sq
$$

This uses fifteen symmetric levels, leaving one of the sixteen possible four-bit codes unused. It is a teaching example, not the definition of a production four-bit format. A weight of 0.31 reconstructs to approximately 0.2857 because the stored code is two. The reconstruction error is about minus 0.0243.

<figure>
<a href="/journal/figures/quantisation-levels.svg" data-figure><img src="/journal/figures/quantisation-levels.svg" width="1200" height="750" alt="A staircase approximation rounds weights between minus one and one to fifteen symmetric reconstructed values using a scale of one seventh." loading="lazy" /></a>
<figcaption><strong>Figure 1.</strong> A simplified symmetric quantiser. Nearby weights can share the same stored value. Real formats may use asymmetric ranges, learned scales or non-uniform codes. <a href="/journal/figures/quantisation-levels.csv" download>Download the example values</a>.</figcaption>
</figure>

Small numerical errors do not translate directly into the same percentage change in answer quality. Some operations tolerate approximation well; others amplify it. That is why file-size arithmetic needs to be followed by task evaluation.

## Not every weight matters equally

The AWQ paper studies weight-only quantisation using activation information to identify important channels and choose scaling. Its central lesson is that simply rounding every weight with one global rule leaves useful information on the table. The deployment benefit depends on the matching inference implementation as well as the compressed values. <a href="#ref-awq" id="cite-awq" class="citation">[1]</a>

GPTQ takes a different route: it uses approximate second-order information to reduce reconstruction error during post-training weight quantisation. Both are examples of methods that do more than save an array with fewer bits. Their published results belong to their tested models and hardware, not to every file carrying a four-bit label. <a href="#ref-gptq" id="cite-gptq" class="citation">[2]</a>

A useful evaluation compares the same base checkpoint before and after compression. Changing the checkpoint, prompt template and quantisation method together makes it hard to identify which change caused a regression.

## Account for the metadata

Many formats divide weights into groups. Each group shares metadata such as a scale or zero point. Smaller groups can represent local value ranges more closely, but they also need more metadata.

Consider an invented format containing four payload bits per weight and thirty-two metadata bits per group. If $N$ weights divide exactly into groups of size $g$, the ideal byte count is:

$$
M=\frac{N\times4}{8}+\frac{N}{g}\times\frac{32}{8}
$$

For eight billion weights and a group size of 128, the payload is four decimal gigabytes and metadata adds 0.25 gigabytes. The total is 4.25 GB before headers, alignment, unquantised tensors and runtime memory. The effective storage is 4.25 bits per weight for this particular invented format.

<figure>
<a href="/journal/figures/quantisation-metadata.svg" data-figure><img src="/journal/figures/quantisation-metadata.svg" width="1200" height="750" alt="For eight billion weights, an invented four-bit format uses 5, 4.5, 4.25 and 4.125 decimal gigabytes at group sizes 32, 64, 128 and 256 respectively." loading="lazy" /></a>
<figcaption><strong>Figure 2.</strong> Analytical metadata overhead for the stated format: one sixteen-bit scale and one sixteen-bit zero point per group. Actual formats make different choices. No runtime allocation is included. <a href="/journal/figures/quantisation-metadata.csv" download>Download the calculation data</a>.</figcaption>
</figure>

Do not use the chart to choose a group size on quality grounds. It contains no quality measurements. Its purpose is to explain why the number on a model label can differ from the final file size.

## Weight precision and activation precision are separate

A weight-only method can keep activations at higher precision. A different method may quantise both. SmoothQuant studies an eight-bit weight-and-activation approach by moving quantisation difficulty from activations toward weights through a mathematically equivalent transformation before quantisation. <a href="#ref-smoothquant" id="cite-smoothquant" class="citation">[3]</a>

These distinctions affect kernel support and hardware efficiency. “INT4” is incomplete as a deployment description. Record what is four-bit, what remains in floating point and where dequantisation occurs.

The attention KV cache is another separate choice. Its memory grows with context length and concurrent sequences, so a compressed model can still run out of memory under a long-context workload. Measure peak resident memory for representative requests rather than adding up weight files alone.

## Make calibration resemble the intended task

Some methods use calibration examples to choose compression parameters. Those examples should reflect the texts the model will process: document structure, language mix, typical context length and important domain terms.

A set of short general conversations may miss the activation patterns of long financial tables. Conversely, calibrating exclusively on one narrow template can give a misleading impression of broad quality. Keep calibration, tuning and final evaluation examples separate.

Maintain a small set of deliberately difficult cases: negative amounts, similar product identifiers, contradictory instructions and required abstentions. Add cases involving uncommon scripts or long inputs when the application needs them. Record the exact calibration dataset version so that a later build can be reproduced.

## Evaluate useful outcomes before throughput

A practical comparison should answer several questions in order:

| Check             | Example measurement                          | What it can reveal                 |
| ----------------- | -------------------------------------------- | ---------------------------------- |
| Output structure  | Valid required fields and types              | Formatting regressions             |
| Task quality      | Accepted extraction or classification result | Business-relevant changes          |
| Important slices  | Performance by language and document type    | Concentrated failures              |
| Abstention        | Correct review routing on ambiguous inputs   | Unsafe overconfidence              |
| Serving behaviour | TTFT, completion latency and peak memory     | Deployment cost and responsiveness |
| Stability         | Repeated runs and load tests                 | Rare failures and queue pressure   |

Use paired examples so each configuration sees the same task. Review disagreements rather than relying only on an overall score. A model that loses one percentage point on a broad benchmark may lose much more on the particular field your application uses.

Finally, measure the actual runtime on the target device. Lower weight precision can reduce memory traffic, but packing, conversion and unsupported kernels can consume some of the gain. Report the serving engine, hardware, batch size, context lengths and model format with the result.

The useful deliverable is a tested configuration: a particular checkpoint, compression recipe, runtime and acceptance record. A small file becomes a practical product component only when that complete configuration works for its intended task.
