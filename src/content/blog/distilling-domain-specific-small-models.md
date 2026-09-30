---
title: 'Distilling Domain-Specific SLMs: Building a Smaller Student That Earns Its Place'
description: 'How teacher models, reviewed examples and independent tests can support a compact domain model, with a clear distinction between imitation, correctness and serving economics.'
publishedAt: 2026-03-12
author: samvit-labs-research
category: Model Research
articleType: Research review
tags: [distillation, small language models, training]
cover: /journal/figures/distillation-break-even.svg
coverAlt: 'An illustrative cost curve shows how a fixed student-training cost can be recovered through lower serving cost after enough accepted tasks.'
evidenceNote: 'Research methods are attributed to their authors. The training pipeline is conceptual and all cost values are invented normalized units, not SAMVIT Labs training results or commercial prices.'
draft: false
references:
  - id: hinton
    title: 'Distilling the Knowledge in a Neural Network'
    author: 'Geoffrey Hinton, Oriol Vinyals and Jeff Dean · version 1'
    url: 'https://arxiv.org/abs/1503.02531v1'
    publishedAt: 2015-03-09
  - id: deepseek
    title: 'DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning'
    author: 'DeepSeek-AI and colleagues · version 1'
    url: 'https://arxiv.org/abs/2501.12948v1'
    publishedAt: 2025-01-22
  - id: minillm
    title: 'Knowledge Distillation of Large Language Models'
    author: 'Yuxian Gu, Li Dong, Furu Wei and Minlie Huang · version 1'
    url: 'https://arxiv.org/abs/2306.08543v1'
    publishedAt: 2023-06-14
---

A large model can produce useful labelled examples for a task that a smaller model cannot yet perform well. That makes it a possible teacher. It does not make every generated example suitable training material.

Suppose the task is turning maintenance notes into a fixed set of fault codes. A teacher might handle unusual phrasing well but invent a code when the note lacks evidence. If those answers enter training unchanged, the student learns both the useful pattern and the invented certainty.

Distillation therefore begins with a task definition and a data-quality process. The model transfer is one part of the work.

## Decide what knowledge you want to transfer

Classic knowledge distillation uses a teacher's predictions to train a student. Hinton, Vinyals and Dean describe how output distributions can convey information about alternatives beyond a single labelled answer. That idea is broader than copying the teacher's most likely output. <a href="#ref-hinton" id="cite-hinton" class="citation">[1]</a>

For a domain workflow, identify the desired behaviour precisely. It might be choosing an approved fault code, extracting supporting text and abstaining when the evidence is insufficient. It is rarely useful to describe the objective as “make the small model as smart as the large one.”

Set acceptance criteria before generating examples. A code must exist in the controlled taxonomy. An extracted serial number must appear in the note. A recommendation that requires a current manual should use a versioned source at inference time rather than rely on training to keep it current.

## Teacher text and teacher probabilities are different resources

A text-only model service can supply answers and explanations. It may not expose the probability distribution over its vocabulary. Training on its generated responses is therefore different from matching full token distributions.

DeepSeek-R1's January 2025 paper reports transferring generated reasoning data into smaller dense models. It is a concrete example of training students from a stronger model's outputs. Its reported reasoning results do not establish that generated reasoning traces are correct for another domain or that a smaller student will reproduce every teacher capability. <a href="#ref-deepseek" id="cite-deepseek" class="citation">[2]</a>

When full teacher probabilities are available, a possible training objective combines labelled supervision with distribution matching:

$$
\mathcal{L}=\lambda\mathcal{L}_{\mathrm{labels}}+(1-\lambda)T^2
D_{\mathrm{KL}}\left(p_t^{(T)}\,\Vert\,p_s^{(T)}\right)
$$

Here $p_t^{(T)}$ and $p_s^{(T)}$ are teacher and student distributions softened by temperature $T$. The mixing weight $\lambda$ sets the relative importance of labelled examples. This is one conventional objective, not the recipe used by every distillation method or the DeepSeek example above.

MiniLLM instead investigates reverse KL divergence for generative model distillation. The distinction matters because the direction of the divergence changes what mismatches are penalized during learning. The appropriate objective and optimization procedure need to be evaluated as a complete method. <a href="#ref-minillm" id="cite-minillm" class="citation">[3]</a>

## Build a teaching set with traceable decisions

Keep the original input, teacher identifier, prompt version, generated answer, source evidence and review decision. If a taxonomy changes, those records let you identify which examples need revision.

For the maintenance-note task, review can combine deterministic checks with expert inspection. A script can reject unknown codes and missing source spans. A domain reviewer can determine whether the chosen code actually follows from the note.

Include abstention examples deliberately. If every teaching example ends with a confident classification, the student receives little instruction about missing evidence. Generate or collect conflicting notes and out-of-scope requests, then label their appropriate handling.

<figure>
<a href="/journal/figures/distillation-pipeline.svg" data-figure><img src="/journal/figures/distillation-pipeline.svg" width="1200" height="750" alt="A conceptual distillation workflow defines the task, generates teacher examples, reviews them, trains a student and evaluates it independently before deployment." loading="lazy" /></a>
<figcaption><strong>Figure 1.</strong> A proposed distillation pipeline. Evaluation examples remain separate from teacher generation, filtering and training decisions.</figcaption>
</figure>

Near-duplicate notes should stay in the same split. A held-out copy with a changed identifier can still leak the structure of a training example. Reserve a later time period or unfamiliar equipment family when that reflects the intended deployment challenge.

## Evaluate correctness rather than teacher agreement

A student can disagree with a teacher and be right. It can also match the teacher perfectly on an incorrect answer. Agreement measures imitation; an independent rubric measures task performance.

Compare the unadapted student, a student trained on human labels, the distilled student and the teacher on the same held-out cases. That comparison shows whether teacher-generated material contributes something beyond ordinary task training.

| Dimension           | Useful measurement                                    |
| ------------------- | ----------------------------------------------------- |
| Correct task output | Approved code and required fields match expert labels |
| Evidence use        | Extracted spans support the output                    |
| Abstention          | Ambiguous or out-of-scope cases receive review        |
| Important slices    | Results by equipment family, language and note length |
| Serving cost        | Resources per accepted result, including fallback     |
| Stability           | Behaviour after prompt, data or runtime changes       |

Inspect disagreements at the field level. A headline accuracy number can hide a student that performs well on common fault types but fails on the rare category responsible for costly rework.

## Calculate whether the training investment pays back

Consider an invented cost model. The teacher costs ten normalized units per accepted task. A student has a fixed setup cost of 1,200 units and then costs two units per accepted task. Assume both meet the same acceptance criteria and that no extra review or fallback is needed.

For $n$ accepted tasks:

$$
C_t(n)=10n,\qquad C_s(n)=1200+2n
$$

Equal cost occurs at $n=1200/(10-2)=150$. At one thousand accepted tasks, the totals are ten thousand and 3,200 units.

<figure>
<a href="/journal/figures/distillation-break-even.svg" data-figure><img src="/journal/figures/distillation-break-even.svg" width="1200" height="750" alt="Under invented normalized costs, teacher serving costs ten units per accepted task and student serving costs 1200 setup units plus two per task, reaching equal cost at 150 tasks." loading="lazy" /></a>
<figcaption><strong>Figure 2.</strong> An illustrative amortization calculation. Setup should include example generation, review, training and evaluation. Equal accepted quality is an assumption, not a measured result. <a href="/journal/figures/distillation-break-even.csv" download>Download the calculation data</a>.</figcaption>
</figure>

If the student needs a teacher fallback, add its expected cost. If the task changes every month, include the cost of maintaining the teaching set and retraining. A short-lived workflow may never reach the useful volume before another update is required.

## Release a versioned system, not just a checkpoint

A student checkpoint depends on its input format, tokenizer, output schema and serving configuration. Keep those versions with the training-data manifest and evaluation record. A later quantisation step is another change that needs a task-level check.

Start with a limited deployment and retain the previous model route. Review accepted errors and abstentions separately. Use new mistakes to improve the next teaching set while preserving fresh data for independent evaluation.

The strongest case for a domain-specific student is a bounded task with stable requirements, enough useful volume and a measurable resource advantage. A teacher can help create that student. Independent evidence must establish whether it deserves the job.
