---
title: 'Training Data for Enterprise Models: Quality, Deduplication and Provenance'
description: 'How to build a traceable domain corpus, prevent duplicate families from leaking across evaluation splits and measure data decisions before spending a training budget.'
publishedAt: 2025-12-11
author: qwerty-labs-research
category: Model Research
articleType: Engineering guide
tags: [training data, deduplication, evaluation]
cover: /journal/figures/training-data-audit.svg
coverAlt: 'An invented corpus audit shows the document counts retained after deduplication, quality checks and rights and privacy review.'
evidenceNote: 'Corpus counts are invented and the split-leakage curve is an analytical illustration. Neither demonstrates model quality, legal clearance or the contents of a QWERTY Labs training corpus.'
draft: false
references:
  - id: fineweb
    title: 'The FineWeb Datasets: Decanting the Web for the Finest Text Data at Scale'
    author: 'Guilherme Penedo and colleagues · version 1'
    url: 'https://arxiv.org/abs/2406.17557v1'
    publishedAt: 2024-06-25
  - id: datacomp
    title: 'DataComp-LM: In search of the next generation of training sets for language models'
    author: 'Jeffrey Li and colleagues · version 1'
    url: 'https://arxiv.org/abs/2406.11794v1'
    publishedAt: 2024-06-17
  - id: datasheets
    title: 'Datasheets for Datasets'
    author: 'Timnit Gebru and colleagues · version 1'
    url: 'https://arxiv.org/abs/1803.09010v1'
    publishedAt: 2018-03-23
---

A folder containing one hundred thousand documents is not yet a training dataset. It may include copied manuals, obsolete policies, broken text extraction and customer information collected for a different purpose.

The first useful artifact is an inventory: what the material contains, where it came from, what use is permitted and which task it is meant to improve. Without that inventory, a larger corpus can simply make the same problems more expensive to train on.

For a domain model, data preparation should be an experiment with traceable decisions. Retaining more documents is not automatically the objective.

## Define the model's intended work

A model trained to classify maintenance notes needs a different corpus from one trained to answer questions about product manuals. The first needs representative examples and stable labels. The second may benefit from controlled retrieval of current documents rather than putting every fact into model weights.

Write down the task, output format, supported languages and expected input distribution. Identify the important failure cases: rare fault codes, ambiguous abbreviations, missing context or outdated instructions.

FineWeb documents a large-scale web-data curation process, including studies of filtering and deduplication choices. Its importance for a smaller enterprise effort is methodological: data decisions should be documented and tested, not treated as invisible preparation before the “real” model work. Its web corpus and benchmark results do not establish the best mixture for a private domain task. <a href="#ref-fineweb" id="cite-fineweb" class="citation">[1]</a>

## Preserve the source before normalizing the text

Keep an immutable source identifier and a record of transformations. Text extraction can change the meaning of a document by losing a table header, joining two columns or dropping a footnote.

For each retained item, useful metadata includes source, version, date, language, extraction method, permitted use and review status. Link the normalized text back to its original location. When a model repeatedly learns a wrong unit, those records make the extraction error discoverable.

Check use permissions and sensitive-data scope at intake. The later review counts in the example below are an audit summary, not a suggestion to train first and resolve permissions afterward. Hold unresolved material outside the eligible training set.

Avoid treating a successful sensitive-data detector run as proof that no sensitive information remains. Sample retained text, inspect known difficult patterns and maintain a process for correcting the dataset when a missed issue is found.

## Track what each filter removes

Consider an invented inventory of one hundred thousand documents. Deduplication leaves 78,000, quality checks leave 70,000 and the final rights and privacy review leaves 62,000 eligible documents.

<figure>
<a href="/journal/figures/training-data-audit.svg" data-figure><img src="/journal/figures/training-data-audit.svg" width="1200" height="750" alt="An illustrative corpus audit retains 100000 raw documents, 78000 after deduplication, 70000 after quality checks and 62000 after rights and privacy review." loading="lazy" /></a>
<figcaption><strong>Figure 1.</strong> Invented sequential document counts. This audit describes retention, not model quality or legal clearance. Document counts also do not imply the same proportions of tokens. <a href="/journal/figures/training-data-audit.csv" download>Download the example counts</a>.</figcaption>
</figure>

The resulting 62% retention rate is neither good nor bad on its own. A filter may remove noise, or it may remove useful minority-language examples. Examine what changed by source, topic, language and document length.

Record removal reasons and filter versions. When two filters reject the same document, preserve enough information to understand their overlap. A simple sequence of headline counts can conceal which rule actually caused the removal.

## Deduplicate before you trust the evaluation split

Exact duplicates are easy to identify with a content hash after a documented normalization step. Near-duplicates need more care: two records can differ in a name or identifier while sharing almost all of their task structure.

Group related documents and conversations before assigning training and test splits. If copies enter both sides, a strong test score can reflect recognition of familiar material rather than useful generalization.

For an analytical illustration, suppose each of $m$ copies is independently assigned to training with probability 0.8 and testing with probability 0.2. The chance that the family appears in both splits is:

$$
P(\text{both splits})=1-0.8^m-0.2^m
$$

The two subtracted terms represent all copies landing in training or all landing in testing. For five copies, the chance of appearing on both sides is 67.2%. That is arithmetic under independent assignment, not an observed leakage rate.

<figure>
<a href="/journal/figures/duplicate-split-leakage.svg" data-figure><img src="/journal/figures/duplicate-split-leakage.svg" width="1200" height="750" alt="An analytical chart shows how independent record-level assignment to an eighty-twenty split increasingly places duplicate families on both sides as the family size grows." loading="lazy" /></a>
<figcaption><strong>Figure 2.</strong> A simplified duplicate-family calculation. Assigning each identified family to one split avoids this particular mechanism, though other semantic overlap can remain. <a href="/journal/figures/duplicate-split-leakage.csv" download>Download the calculation data</a>.</figcaption>
</figure>

A time-based split can answer another important question: does the model handle later terminology and document versions? A source-based split can test unfamiliar suppliers or equipment families. Choose splits that reflect the intended claim about generalization.

## Compare data changes under controlled training conditions

If a new corpus produces a better model after twice as many training tokens and a larger architecture, it is difficult to isolate the contribution of the data itself.

DataComp-LM provides a controlled setting for studying language-model dataset curation. The relevant lesson is to hold the training and evaluation setup sufficiently stable when comparing candidate data pipelines. Its published outcomes are evidence about its experiments, not a universal quality score for a document collection. <a href="#ref-datacomp" id="cite-datacomp" class="citation">[2]</a>

For a focused experiment, keep the base model, token budget, optimization settings and evaluation set fixed. Compare a documented baseline corpus with one changed filtering or sampling decision. Use repeated runs when training variability is material to the decision.

Look at task slices as well as averages. Removing unusual examples might improve a common-case score while harming exactly the difficult cases the business needs the model to handle.

## Keep human labels consistent

A compact model cannot learn a stable distinction from contradictory labels. Give reviewers a short rubric with examples, borderline cases and an explicit unknown label.

Measure reviewer agreement on a shared subset, then resolve disagreements that reveal an unclear taxonomy. Do not automatically erase legitimate ambiguity by forcing a majority vote. Some inputs genuinely lack enough evidence for one correct classification.

Review synthetic examples with the same rubric. A teacher model can generate polished text that contains a wrong label, impossible scenario or repeated template. Treat generated data as another source with known limitations.

## Publish a dataset record with the model version

Datasheets for Datasets proposes documenting motivation, collection, composition and recommended uses. A domain corpus benefits from the same discipline even when its contents remain private. <a href="#ref-datasheets" id="cite-datasheets" class="citation">[3]</a>

| Dataset record                    | Why it matters                                     |
| --------------------------------- | -------------------------------------------------- |
| Purpose and excluded uses         | Limits what the training set is meant to support   |
| Source and permitted-use records  | Connects retained material to its origin and scope |
| Extraction and filter versions    | Makes transformations reproducible                 |
| Duplicate-family and split policy | Helps assess evaluation independence               |
| Composition by important slice    | Exposes missing or overrepresented examples        |
| Review and correction history     | Makes known issues actionable                      |

Keep a manifest or fingerprint of the exact eligible items used for each model run. A folder name such as “final-clean-data” is not enough to reproduce a training result.

The useful outcome is a corpus whose contents, limits and changes can be explained. That gives an LLM or SLM development effort a stronger foundation than raw volume alone, and makes later improvements easier to attribute to evidence.
