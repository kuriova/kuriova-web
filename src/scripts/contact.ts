// Sends the contact form without leaving the page and shows errors next to the fields.
// Without JavaScript the form still posts to /api/contact and lands on /contact/sent.
const form = document.querySelector<HTMLFormElement>('#contact-form');
const status = document.querySelector<HTMLElement>('#contact-status');
const sent = document.querySelector<HTMLElement>('#contact-sent');

type Reply = { ok: boolean; error?: string; fields?: Record<string, string> };

const FALLBACK = 'We couldn’t send your message. Please email us at hello@kuriova.com instead.';
const MESSAGES: Record<string, string> = {
  invalid: 'Please check the highlighted fields.',
  rate_limited: 'That’s a lot of messages in a short time. Please try again in a few minutes.',
};

if (form && status && sent) {
  const started = form.elements.namedItem('t');
  if (started instanceof HTMLInputElement) started.value = String(Date.now());

  // /contact?topic=sponsorship preselects the topic.
  const topic = new URLSearchParams(location.search).get('topic');
  const select = form.elements.namedItem('topic');
  if (topic && select instanceof HTMLSelectElement && [...select.options].some((o) => o.value === topic)) {
    select.value = topic;
  }

  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showFieldErrors({});
    setStatus('Sending…');
    if (button) button.disabled = true;

    let reply: Reply = { ok: false };
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      reply = await res.json();
    } catch {
      reply = { ok: false };
    }

    if (button) button.disabled = false;
    if (reply.ok) {
      form.hidden = true;
      sent.hidden = false;
      sent.focus();
      return;
    }
    showFieldErrors(reply.fields ?? {});
    setStatus((reply.error && MESSAGES[reply.error]) || FALLBACK, true);
  });

  function setStatus(text: string, isError = false) {
    status!.textContent = text;
    status!.classList.toggle('is-error', isError);
  }

  function showFieldErrors(errors: Record<string, string>) {
    let first: HTMLElement | null = null;
    for (const name of ['name', 'email', 'organisation', 'topic', 'message']) {
      const input = form!.elements.namedItem(name);
      const message = document.getElementById(`cf-${name}-error`);
      if (!(input instanceof HTMLElement) || !message) continue;
      const error = errors[name];
      message.textContent = error ?? '';
      message.hidden = !error;
      if (error) {
        input.setAttribute('aria-invalid', 'true');
        first ??= input;
      } else {
        input.removeAttribute('aria-invalid');
      }
    }
    first?.focus();
  }
}
