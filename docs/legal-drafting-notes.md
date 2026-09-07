# Legal pages: configuration and review notes

For the current QWERTY Labs website. These notes record the factual basis and authorities used for the website templates. They are not a legal opinion, security audit or confirmation of enforceability.

Revised on 7 September 2026; website documents are version 1.2. The registered entity is **QWERTY Labs Private Limited**, trading as **QWERTY Labs**, with a registered location in Bangalore. The location is rendered as Bengaluru (Bangalore), Karnataka, India. Legal formalities remain incomplete; this revision is not a new legal review.

## Company particulars

`src/data/legal-details.json` contains the confirmed entity, trading name, Bangalore location and Karnataka jurisdiction. Complete the registered street address, Grievance Officer, privacy email, legal-notice email and adopted effective date. Optional registration and telephone fields appear only when supplied. Use `YYYY-MM-DD` for dates. Do not replace missing company information with the fictional founder profiles.

Values are rendered at build time. Registration details and the registered address appear in Terms of Service rather than Privacy. Terms presents the registered entity and trading name above a responsive two-column details card, with location and a legal-notice/contact route. Privacy retains the trading name, privacy/grievance contacts and request procedure; it does not render company registration rows. Unfilled optional contact rows and the effective date are omitted, without invented values or public completion notices. The contact form is the interim contact route. These presentation changes do not complete statutory contact publication duties, legal adoption or operational compliance. Rebuild and publish after an edit. Both routes retain `noindex`.

## Confirmed facts

Company policies require restricted staff access and prohibit training with client data. Both documents treat these as current policies. Encryption, MFA, segregation, backups, retention schedules, provider/location approval and independent certifications were not confirmed. Additional safeguards are written as requirements to specify and verify before the relevant project processing, without claiming that every control already operates.

Enquiries are reviewed locally, validated by a Vercel function and checked with Turnstile before authenticated delivery to a private Google Sheets receiver. Confirmation requires a matching saved-row acknowledgement. Missing configuration fails closed; delivery errors leave the form available for correction or an unchanged retry. Internal notification emails have separate status tracking, so an email failure does not invalidate a saved enquiry. Provider, access, retention and transfer wording appears in the Privacy Policy. See `docs/google-sheets-enquiries.md` and `docs/production-setup.md`.

Reading preferences and explicitly saved workflow drafts use browser local storage. Exports remain on the user's device. The application has no added advertising or analytics scripts, client-data backend or live model endpoint. Hosting/access logs are distinct from enquiry records and local browser preferences.

## Indian legal sources

- [Digital Personal Data Protection Act, 2023 — MeitY Gazette copy](https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf).
- [G.S.R. 843(E), 13 November 2025 — commencement notification](https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf).
- [Digital Personal Data Protection Rules, 2025 — G.S.R. 846(E)](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf).
- [SPDI Rules, 2011 — Gazette text reproduced by WIPO Lex](https://www.wipo.int/wipolex/en/legislation/details/15063).
- [Government clarification of the SPDI Rules, 24 August 2011](https://www.pib.gov.in/newsite/erelcontent.aspx?relid=74990&reg=48&lang=2).
- [CERT-In directions of 28 April 2022](https://www.cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf).
- [Indian Contract Act, 1872 — India Code entry](https://www.indiacode.nic.in/handle/123456789/2187). Check provision-specific drafting against the current consolidated text during legal review.
- [Consumer Protection Act, 2019 — Department of Consumer Affairs Gazette copy](https://consumeraffairs.gov.in/public/upload/files/CP%20Act%202019_1732700731.pdf).

The DPDP commencement notification places substantive processing duties and most individual rights in the eighteen-month group. The Rules also have staged commencement. The documents therefore apply those statutory duties and remedies according to their notified commencement, without claiming the whole regime is already operative. They avoid a calculated calendar deadline, which can be affected by publication-date interpretation or subsequent notifications.

SPDI Rule 5(9) provides for a published Grievance Officer and redress within one month where it applies. The 2011 government clarification distinguishes some processor arrangements from direct collection obligations under Rules 5 and 6; roles and actual processing must be assessed for each engagement. The privacy wording preserves applicable duties without treating the entire company as exempt.

CERT-In's six-hour reporting requirement concerns listed incidents reported to the authority; it is not a universal six-hour client-notification promise. The 180-day ICT-log rule is not a blanket retention term for every client record. Client notice, evidence, deletion and backup handling require the actual project terms and applicable statutory duties.

## Before adoption for business use

Indian counsel should review the completed entity/contact particulars, the competent court selection, actual services and processing roles, current commencement notifications, sector-specific obligations and the policy commitments against operating procedures. Adopt an effective date only after that review and completion of the necessary arrangements.

Website Terms do not replace a signed service agreement, statement of work, confidentiality agreement or project-specific data-processing/security schedule. They preserve mandatory consumer remedies and do not attempt to confer jurisdiction on an otherwise incompetent court. An enquiry confirmation does not replace a substantive response to a privacy request or override formal legal-notice requirements. Supply working privacy/legal channels and the full registered address before relying on these documents for business collection; the production enquiry receiver requires private configuration and a live service check before use.
