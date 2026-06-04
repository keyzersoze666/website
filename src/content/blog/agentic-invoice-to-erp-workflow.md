---
title: 'From Invoice to ERP: Designing an Agentic Accounts-Payable Workflow'
description: 'A concrete invoice-processing blueprint with source-backed extraction, approval controls, idempotent posting and an honest calculation of potential handling-time savings.'
publishedAt: 2026-06-04
author: qwerty-labs-research
category: Agentic AI
articleType: Use-case blueprint
tags: [accounts payable, document AI, workflow automation]
cover: /journal/figures/invoice-handling-time.svg
coverAlt: 'An illustrative accounts-payable calculation compares 300 baseline handling hours with 91.7 assisted hours for one thousand invoices.'
evidenceNote: 'This is a proposed workflow and a hypothetical workload calculation. It is not a customer case study, an achieved speedup or a claim that payment authorization can be delegated to a language model.'
draft: false
references:
  - id: ubl
    title: 'Universal Business Language Version 2.3'
    author: 'OASIS · approved standard'
    url: 'https://docs.oasis-open.org/ubl/os-UBL-2.3/UBL-2.3.html'
    publishedAt: 2021-06-15
  - id: docile
    title: 'DocILE Benchmark for Document Information Localization and Extraction'
    author: 'Štěpán Šimsa and colleagues · version 1'
    url: 'https://arxiv.org/abs/2302.05658v1'
    publishedAt: 2023-02-11
  - id: idempotency
    title: 'Making retries safe with idempotent APIs'
    author: 'AWS Builders’ Library'
    url: 'https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/'
---

An invoice arrives as a PDF attached to an email. A person identifies the supplier, reads the purchase-order number, checks the amount, finds the receiving record and enters a draft into the accounting system. If something does not match, the invoice waits in a separate queue.

The opportunity for AI is not simply reading the PDF faster. It is reducing repeated handling between documents, business rules and systems while making exceptions easier to resolve. That requires a workflow with clear states, evidence and approval boundaries.

The design below is a blueprint. Its numbers are a worked example, not a report of a customer deployment.

## Start with the invoice record you actually need

Define the target record before selecting an extraction model. A useful invoice object might include supplier identifier, invoice number, issue date, currency, net amount, tax amount, total amount, purchase-order references and line items.

Use decimal or integer-minor-unit arithmetic for money in the application. Do not ask a language model to be the final calculator. Currency, tax treatment and rounding rules need explicit representation.

OASIS Universal Business Language provides structured business document models, including invoices and related procurement documents. It offers a useful reference vocabulary even when the incoming document is an unstructured PDF. Supporting a subset of those fields is an integration decision; it does not make a custom JSON object a conforming UBL document. <a href="#ref-ubl" id="cite-ubl" class="citation">[1]</a>

Keep the original document and link each extracted field to a page and source location. When a reviewer sees a suspicious amount, the system should open the supporting text rather than ask them to search the whole document again.

## Extraction is only the first decision

A model can return the correct total and still misunderstand the invoice. It may attach a line item to the wrong table row, confuse the supplier with a shipping address or omit a credit note.

DocILE distinguishes key information extraction from line-item recognition on business documents. Its benchmark includes varied layouts and unfamiliar-layout cases, illustrating why a field-level test alone is insufficient for document workflows. Its scores are not a substitute for evaluating the invoices a particular business receives. <a href="#ref-docile" id="cite-docile" class="citation">[2]</a>

Build a test set around actual document variation: multiple pages, scans, repeated headers, negative values, non-standard date formats and different currencies. Keep related supplier templates together when splitting training and test data. Otherwise the evaluation may mostly test whether the system remembers a familiar layout.

A critical field should have a distinct failure rule. An uncertain bank account number cannot be treated like a missing optional description.

## Match against controlled business records

Once extraction is complete, validate the record against authoritative systems. Does the supplier exist? Is the invoice number already recorded for that supplier? Does the currency match the purchase order? Do invoice quantities agree with the receipt, within a documented tolerance?

These checks are application logic. An agent can gather records and propose a resolution, but it should not invent a new tolerance because an invoice appears reasonable.

Separate disagreement from missing evidence. “The receipt quantity differs” is a different state from “the receipt service is unavailable.” The first needs a business review; the second may need a technical retry. Merging both into one generic failure queue makes operations harder to manage.

<figure>
<a href="/journal/figures/invoice-control-flow.svg" data-figure><img src="/journal/figures/invoice-control-flow.svg" width="1200" height="750" alt="An illustrative invoice workflow progresses through capture, validation and matching, exception review, approval, idempotent posting and reconciliation." loading="lazy" /></a>
<figcaption><strong>Figure 1.</strong> A proposed control flow. Creating a draft record, approving expenditure and releasing payment remain separate permissions. A vendor bank-detail change requires its own verified process.</figcaption>
</figure>

## Make every exception actionable

An exception record should say what is wrong, which evidence was used and who owns the next step. “Needs review” without a reason merely moves work from one inbox to another.

For a price mismatch, present the invoice price, purchase-order price, applicable tolerance and source locations. For a missing receipt, show whether the receipt is absent or simply could not be retrieved. For a possible duplicate, show the existing ledger record and the matching fields.

Define service levels for these queues. A fast routine path can coexist with slower end-to-end processing if difficult invoices accumulate without an owner. Measure queue age and total elapsed time alongside hands-on handling minutes.

## Design posting for uncertain network outcomes

Suppose an ERP accepts a draft invoice but the response times out. Retrying with a new operation identifier can create a duplicate. Declaring failure can also be wrong because the original record may already exist.

AWS's Builders’ Library explains idempotent API design using client request identifiers and semantically consistent retries. In this workflow, use the ERP's supported idempotency mechanism where available, and maintain a durable operation record so a retry refers to the same intended action. <a href="#ref-idempotency" id="cite-idempotency" class="citation">[3]</a>

An identifier by itself does not guarantee safety. Its scope, retention period and treatment of changed request payloads must match the underlying service. If the integration lacks a suitable mechanism, reconcile against supported business keys and require review when the result is ambiguous.

Read the created record back before announcing success. Keep “submitted,” “confirmed” and “unknown” as distinct states. Payment release should use separately authorized controls rather than being inferred from a successful draft posting.

## Calculate handling-time capacity with the exception mix

Take an invented weekly workload of one thousand invoices. Baseline hands-on handling is eighteen minutes per invoice. In the proposed assisted workflow, suppose 70% need two minutes, 20% need eight minutes of review and 10% need twenty-five minutes of exception handling.

The weighted mean is:

$$
\bar{t}=0.70(2)+0.20(8)+0.10(25)=5.5\text{ minutes per invoice}
$$

Baseline handling is 300 hours. Assisted handling is about 91.7 hours. The implied handling-capacity ratio is $18/5.5\approx3.27$. This is neither a promised speedup nor a claim that invoices reach payment 3.27 times faster.

<figure>
<a href="/journal/figures/invoice-handling-time.svg" data-figure><img src="/journal/figures/invoice-handling-time.svg" width="1200" height="750" alt="A hypothetical one-thousand-invoice workload takes 300 baseline human hours versus 91.7 assisted hours, including routine checks, review and complex exceptions." loading="lazy" /></a>
<figcaption><strong>Figure 2.</strong> Illustrative human handling time under the stated workload mix. Integration costs, model costs and waiting for approval or receipt are excluded. <a href="/journal/figures/invoice-handling-time.csv" download>Download the calculation data</a>.</figcaption>
</figure>

The example frees about 208.3 hours of handling capacity. Converting that into cash savings requires separate evidence about staffing, workload and operating expenses. A team may instead use the time to clear a backlog or perform better checks.

Sensitivity matters. If ten percentage points move from the two-minute path to the twenty-five-minute path, mean handling rises by 2.3 minutes to 7.8. The capacity ratio falls to about 2.31. Exception behaviour deserves the same attention as the routine demo.

## Pilot with drafts before autonomous writes

Begin with historical replay and a documented rubric. Measure critical-field correctness, duplicate detection, match decisions and review reasons. Then run in shadow mode: generate proposed records while the existing process remains authoritative.

A controlled next step is draft creation with human approval. Expand permissions only after the application demonstrates acceptable results under realistic outages, duplicate submissions and unfamiliar document layouts.

| Operational measure        | What it protects against                           |
| -------------------------- | -------------------------------------------------- |
| Critical-field correctness | Wrong supplier, amount, currency or reference      |
| Duplicate posting rate     | Repeated financial records                         |
| Exception age and owner    | Work disappearing into an unattended queue         |
| Human minutes per invoice  | Automation that quietly increases review work      |
| Confirmed completion rate  | Reporting a submitted request as a finished result |
| Audit trace completeness   | Decisions that cannot be reconstructed             |

A useful invoice agent makes evidence and next steps easier to inspect. The strongest pilot is one where the finance team can explain every posted record, identify every unresolved exception and measure the handling time that changed. That provides a credible basis for expanding the workflow.
