interface EnquirySubmission {
  submissionId: string;
  kind: 'contact' | 'demo';
  name: string;
  email: string;
  company: string;
  interest: string;
  topic: string;
  message: string;
  website: string;
  turnstileToken: string;
}

export async function deliverEnquiry(
  endpoint: string,
  submission: EnquirySubmission,
  request: typeof fetch = fetch
): Promise<void> {
  if (endpoint !== '/api/enquiries')
    throw new Error(
      'The enquiry service is unavailable. Please try again later.'
    );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);
  try {
    const response = await request(endpoint, {
      method: 'POST',
      credentials: 'same-origin',
      redirect: 'error',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission),
      signal: controller.signal,
    });
    const result: unknown = await response.json();
    if (
      response.ok &&
      result &&
      typeof result === 'object' &&
      'ok' in result &&
      result.ok === true &&
      'submissionId' in result &&
      result.submissionId === submission.submissionId
    )
      return;
    const code =
      result && typeof result === 'object' && 'code' in result
        ? result.code
        : '';
    if (code === 'RATE_LIMIT')
      throw new Error('Too many requests. Please try again later.');
    if (code === 'VERIFICATION')
      throw new Error('Please complete the security check again, then retry.');
    if (code === 'INVALID_INPUT')
      throw new Error('Please check the details in the form and try again.');
    if (code === 'UNAVAILABLE')
      throw new Error(
        'The enquiry service is unavailable. Please try again later.'
      );
    throw new Error(
      'We couldn’t confirm delivery. Your request may have been received. Retry without changing the form to avoid a duplicate.'
    );
  } catch (error) {
    if (
      error instanceof Error &&
      !['AbortError', 'TypeError', 'SyntaxError'].includes(error.name)
    )
      throw error;
    throw new Error(
      'We couldn’t confirm delivery. Your request may have been received. Retry without changing the form to avoid a duplicate.'
    );
  } finally {
    clearTimeout(timeout);
  }
}
