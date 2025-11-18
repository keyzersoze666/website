interface Turnstile {
  render(element: HTMLElement, options: Record<string, unknown>): string;
  getResponse(id: string): string | undefined;
  reset(id: string): void;
}
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let widget: string | undefined;
const container = document.querySelector<HTMLElement>('[data-enquiry-captcha]');
const status = document.querySelector<HTMLElement>('#enquiry-status');
let loading: Promise<void> | undefined;

function load() {
  loading ??= new Promise<void>((resolve, reject) => {
    if (!container?.dataset.sitekey) {
      reject(
        new Error('The enquiry service is unavailable. Please try again later.')
      );
      return;
    }
    const script = document.createElement('script');
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    const fail = () => {
      clearTimeout(timeout);
      script.onload = null;
      script.onerror = null;
      script.remove();
      reject(
        new Error('The security check could not load. Please reload the page.')
      );
    };
    const timeout = setTimeout(fail, 10_000);
    script.onload = () => {
      clearTimeout(timeout);
      if (!window.turnstile) {
        fail();
        return;
      }
      try {
        widget = window.turnstile.render(container, {
          sitekey: container.dataset.sitekey,
          action: 'enquiry',
          theme: 'auto',
          size: 'flexible',
          'response-field': false,
          'error-callback': () => {
            if (status) {
              status.textContent =
                'The security check is unavailable. Please reload the page and try again.';
              status.hidden = false;
            }
          },
        });
        resolve();
      } catch {
        fail();
      }
    };
    script.onerror = fail;
    document.head.append(script);
  });
  return loading;
}

if (container?.dataset.sitekey) void load().catch(() => {});

export async function enquiryToken(): Promise<string> {
  await load();
  const token =
    widget === undefined ? '' : window.turnstile?.getResponse(widget);
  if (!token)
    throw new Error('Please complete the security check before submitting.');
  return token;
}

export function resetEnquiryToken() {
  if (widget !== undefined) window.turnstile?.reset(widget);
}
