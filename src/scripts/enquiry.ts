import {
  enquiryBrief,
  enquiryHref,
  findEnquiryTopic,
  type EnquiryKind,
} from '../data/enquiry-topics';
import { deliverEnquiry } from './enquiry-delivery';
import { enquiryToken, resetEnquiryToken } from './enquiry-captcha';

const form = document.querySelector<HTMLFormElement>('#lead-form');
const reviewControl = document.querySelector<HTMLButtonElement>('#lead-review');
const submitControl = document.querySelector<HTMLButtonElement>('#lead-submit');
const review = document.querySelector<HTMLElement>('#form-review');
const enquiryPrompt = document.querySelector<HTMLElement>(
  '[data-enquiry-prompt]'
);

if (form && reviewControl && submitControl && review && enquiryPrompt) {
  const status = document.querySelector<HTMLElement>('#enquiry-status');
  let sending = false;
  let submissionId: string | undefined;
  const submitLabel = submitControl.textContent;
  const kind: EnquiryKind =
    form.dataset.enquiryKind === 'Demo request' ? 'demo' : 'contact';
  const interest = form.querySelector<HTMLSelectElement>('[name="interest"]');
  const context = document.querySelector<HTMLElement>('[data-enquiry-context]');
  const returnLink = document.querySelector<HTMLAnchorElement>(
    '[data-enquiry-return]'
  );
  const switchLink = document.querySelector<HTMLAnchorElement>(
    '[data-enquiry-switch]'
  );
  const arrivingTopic = findEnquiryTopic(
    new URLSearchParams(window.location.search).get('topic')
  );
  if (interest && arrivingTopic) interest.value = arrivingTopic.id;
  const updateTopic = () => {
    const topic = findEnquiryTopic(interest?.value);
    if (context && returnLink) {
      context.hidden = !topic;
      if (topic) {
        returnLink.textContent = topic.label;
        returnLink.href = topic.href;
      }
    }
    if (switchLink)
      switchLink.href = enquiryHref(
        kind === 'demo' ? 'contact' : 'demo',
        topic?.id
      );
  };
  updateTopic();
  interest?.addEventListener('change', updateTopic);
  form.addEventListener('input', () => {
    review.hidden = true;
    submissionId = undefined;
    if (status) status.hidden = true;
  });
  form.addEventListener('change', () => {
    review.hidden = true;
    submissionId = undefined;
    if (status) status.hidden = true;
  });
  reviewControl.disabled = false;
  reviewControl.addEventListener('click', () => {
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const value = (name: string) => String(values.get(name) ?? '').trim();
    enquiryPrompt.textContent = enquiryBrief(
      {
        name: value('name'),
        company: value('company'),
        email: value('email'),
        topicId: value('interest'),
        message: value('message'),
      },
      kind
    );
    review.hidden = false;
    review.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'nearest',
    });
    review.focus({ preventScroll: true });
  });
  const openConfirmation = async () => {
    if (sending || !form.reportValidity()) return;
    const endpoint = form.dataset.deliveryUrl?.trim() ?? '';
    sending = true;
    submitControl.disabled = true;
    reviewControl.disabled = true;
    submitControl.textContent = 'Sending…';
    form.setAttribute('aria-busy', 'true');
    if (status) status.hidden = true;
    try {
      const values = new FormData(form);
      const value = (name: string) => String(values.get(name) ?? '').trim();
      const topic = findEnquiryTopic(value('interest'));
      // A timeout can hide a saved row. Keep the ID for an unchanged retry.
      submissionId ??= crypto.randomUUID();
      await deliverEnquiry(endpoint, {
        submissionId,
        kind,
        name: value('name'),
        email: value('email'),
        company: value('company'),
        interest: topic?.id ?? '',
        topic: topic?.label ?? '',
        message: value('message'),
        website: value('website'),
        turnstileToken: await enquiryToken(),
      });
      window.location.assign('/enquiry-received/');
    } catch (error) {
      if (status) {
        status.textContent =
          error instanceof Error
            ? error.message
            : 'We couldn’t confirm delivery. Your details are still in the form. Please retry without changing them.';
        status.hidden = false;
        status.focus({ preventScroll: true });
      }
    } finally {
      resetEnquiryToken();
      sending = false;
      submitControl.disabled = false;
      reviewControl.disabled = false;
      submitControl.textContent = submitLabel;
      form.removeAttribute('aria-busy');
    }
  };
  submitControl.addEventListener('click', openConfirmation);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    return openConfirmation();
  });
  form.addEventListener('keydown', (event) => {
    if (
      event.key === 'Enter' &&
      !event.isComposing &&
      event.target instanceof HTMLInputElement
    ) {
      event.preventDefault();
      return openConfirmation();
    }
  });
}
