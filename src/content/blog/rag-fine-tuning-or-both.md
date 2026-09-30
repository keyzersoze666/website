---
title: 'RAG, Fine-Tuning or Both? Choosing How an Enterprise Model Learns'
description: 'A practical way to separate changing business knowledge from stable task behaviour, diagnose missing evidence and decide which part of an AI system to improve.'
publishedAt: 2025-12-22
author: samvit-labs-research
category: Engineering
articleType: Engineering guide
tags: [retrieval, fine-tuning, enterprise knowledge]
cover: /journal/figures/rag-adaptation-architecture.svg
coverAlt: 'A conceptual architecture separates current-document retrieval from adaptation on approved task examples before combining them in an answer.'
evidenceNote: 'The architecture is a proposed design. The retrieval-success curve is an illustrative conditional-probability calculation, not a comparison of measured commercial systems.'
draft: false
references:
  - id: rag
    title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks'
    author: 'Patrick Lewis and colleagues · version 1'
    url: 'https://arxiv.org/abs/2005.11401v1'
    publishedAt: 2020-05-22
  - id: lora
    title: 'LoRA: Low-Rank Adaptation of Large Language Models'
    author: 'Edward J. Hu and colleagues · version 1'
    url: 'https://arxiv.org/abs/2106.09685v1'
    publishedAt: 2021-06-17
  - id: lost-middle
    title: 'Lost in the Middle: How Language Models Use Long Contexts'
    author: 'Nelson F. Liu and colleagues · version 1'
    url: 'https://arxiv.org/abs/2307.03172v1'
    publishedAt: 2023-07-06
  - id: ragas
    title: 'RAGAS: Automated Evaluation of Retrieval Augmented Generation'
    author: 'Shahul Es, Jithin James, Luis Espinosa-Anke and Steven Schockaert · version 1'
    url: 'https://arxiv.org/abs/2309.15217v1'
    publishedAt: 2023-09-26
---

A company changes its refund policy on Monday. Its assistant still gives Friday's answer on Tuesday. Should the team fine-tune the model?

First find out what the assistant received. If retrieval supplied the old policy, changing model weights may leave the actual problem untouched. If the correct passage was present but the model ignored a clear exception, the failure sits somewhere else.

Retrieval-augmented generation, or RAG, and fine-tuning are often presented as competing purchases. They change different parts of a system. A useful decision begins with the failure you can observe, the information that needs to change and the behaviour that needs to remain stable.

## Retrieval supplies information at the time of the request

In a typical enterprise RAG application, the system searches an approved document collection, selects relevant passages and includes them in the model's context. The model then generates an answer using that context.

The original RAG research combined learned model knowledge with an external retrieval index. Modern enterprise pipelines vary substantially, but the distinction remains useful: information can live outside the model's parameters and be supplied when needed. <a href="#ref-rag" id="cite-rag" class="citation">[1]</a>

That makes retrieval a natural candidate for changing policies, product documents and account-specific records. Updating the source and index can make new information available without retraining the model. It still takes a reliable publication process: old versions need to be retired, effective dates preserved and access rules enforced before passages reach the prompt.

A citation is also not proof by itself. The cited passage must actually support the claim, belong to the correct policy version and be accessible to the current user.

## Fine-tuning changes the model's behaviour

Fine-tuning updates model parameters using examples. It can help with a stable classification convention, a particular output structure or the way a model follows domain instructions. The training data and evaluation rubric determine which behaviour is being encouraged.

LoRA is a parameter-efficient adaptation method that freezes the original model weights and trains smaller low-rank updates. It reduces the trainable parameter burden compared with updating the full model. It does not turn an adapter into a live database of the company's latest facts. <a href="#ref-lora" id="cite-lora" class="citation">[2]</a>

Consider a claims assistant that must return five fields with exact labels. Repeated formatting mistakes might justify adaptation after prompt and schema-based approaches have been evaluated. A daily change to claim eligibility is a different problem: that rule needs a controlled source, an effective date and a way to reach the model during the request.

A fine-tuned model can still use retrieval. The retrieved material supplies the evidence; adaptation helps the model perform a consistent task with that evidence.

<figure>
<a href="/journal/figures/rag-adaptation-architecture.svg" data-figure><img src="/journal/figures/rag-adaptation-architecture.svg" width="1200" height="750" alt="Current authorized documents flow through retrieval while approved task examples flow through adaptation; both can contribute to the final answer." loading="lazy" /></a>
<figcaption><strong>Figure 1.</strong> Two distinct information paths in a possible enterprise design. Combining them is useful only when each path addresses an observed need.</figcaption>
</figure>

## Diagnose the request before choosing a method

For the outdated refund answer, capture a trace containing the question, user identity scope, retrieved document identifiers, document versions, selected passages, prompt version and generated answer. Redact sensitive values according to the application's logging policy.

Then ask a sequence of concrete questions. Was the correct policy in the searchable collection? Was it eligible for this user? Did the retriever find it? Did the final prompt include the relevant exception? Did the answer follow it?

These checks produce different remedies:

| Observed failure                      | First place to investigate             |
| ------------------------------------- | -------------------------------------- |
| New policy absent from the index      | Ingestion and publication pipeline     |
| Wrong tenant's document returned      | Authorization and retrieval filters    |
| Right document, wrong passage         | Chunking, search and ranking           |
| Passage omitted from the final prompt | Context selection and token budget     |
| Evidence present, rule misapplied     | Prompt, model capability or adaptation |
| Correct answer, wrong schema          | Structured output and task behaviour   |

Treat the table as a diagnosis order, not a guarantee that one component is responsible. Several failures can coexist. A wrong access filter and a weak ranking model require separate fixes even if both lead to a bad answer.

## There is a measurable ceiling from missing evidence

Suppose an evaluation set contains one hundred questions that require company documents. Sufficient supporting evidence reaches the model for eighty questions. Of those eighty, seventy-two answers pass the acceptance rubric.

Let $R$ mean that sufficient evidence is retrieved and $A$ mean that an answer is accepted. When an evidence-supported accepted answer requires $R$, the relevant probability is:

$$
P(A\cap R)=P(R)P(A\mid R)=0.80\times0.90=0.72
$$

This is conditional probability, not an assumption that retrieval and generation are independent. The second rate is measured only among cases where enough evidence was available.

<figure>
<a href="/journal/figures/rag-retrieval-ceiling.svg" data-figure><img src="/journal/figures/rag-retrieval-ceiling.svg" width="1200" height="750" alt="An illustrative calculation holds conditional answer acceptance at 90 percent and shows end-to-end supported acceptance reaching 72 percent when sufficient evidence retrieval is 80 percent." loading="lazy" /></a>
<figcaption><strong>Figure 2.</strong> A sensitivity calculation with a fixed conditional acceptance rate. It is not a measured retrieval benchmark. Unsupported guesses count as failures even when they happen to be correct. <a href="/journal/figures/rag-retrieval-ceiling.csv" download>Download the calculation data</a>.</figcaption>
</figure>

Improving generation from 90% to 95% in this invented example raises the end-to-end rate from 72% to 76%. Improving evidence retrieval from 80% to 90%, while retaining the original generation rate, raises it to 81%. These numbers illustrate why tracing the bottleneck matters more than choosing a fashionable intervention.

## More context does not automatically fix retrieval

Putting the entire manual into the prompt can simplify a prototype. It also increases the material the model must use correctly. Important clauses may be distant from the question or surrounded by conflicting versions.

The Lost in the Middle study found position-sensitive performance on its tested question-answering and key-value tasks. That result motivates position and length tests; it does not establish that every later model has the same curve. <a href="#ref-lost-middle" id="cite-lost-middle" class="citation">[3]</a>

Evaluate your own model with evidence at different positions, with distracting text and with near-identical but outdated clauses. Try the context sizes the application actually uses. Retain document boundaries and effective dates so the model can distinguish one policy from another.

For tables, preserve relationships among headers, rows and footnotes. A perfectly retrieved cell can be misleading when its currency or exception note is missing.

## Evaluate the components and the final answer

RAGAS is one research framework that separates dimensions such as retrieved context relevance and generation faithfulness. It is useful evidence that a pipeline needs more than one score. Automated judgments remain measurements with limitations, so inspect disagreements and retain human-labelled examples for important business decisions. <a href="#ref-ragas" id="cite-ragas" class="citation">[4]</a>

Track evidence sufficiency, claim support, task correctness, abstention and access-control failures separately. A faithful answer can faithfully repeat an outdated source. A correct answer can be unsupported by the evidence actually shown. Those are different outcomes.

For an adaptation experiment, compare the base model and adapted model with the same retrieval output. For a retrieval experiment, keep the model and prompt fixed. These controlled comparisons make improvement easier to attribute.

Choose the smallest intervention that addresses the observed problem, then evaluate the complete system again. An enterprise assistant becomes maintainable when the team can say which facts come from controlled sources, which behaviours come from training and how both are checked after each change.
