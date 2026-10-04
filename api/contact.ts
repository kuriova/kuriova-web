/**
 * Contact form handler (a Vercel Function, served at /api/contact).
 *
 * Checks the form and emails it to Kuriova's inbox through Cloudflare Email Service.
 * Nothing is stored. Sends to a verified Email Routing destination are free on every
 * Cloudflare plan, and only those are possible until a sending domain is onboarded.
 *
 * Environment (Vercel → kuriova-web → Settings → Environment Variables):
 *   CLOUDFLARE_ACCOUNT_ID   the Cloudflare account that runs Email Routing for kuriova.com
 *   CLOUDFLARE_EMAIL_TOKEN  an API token with only "Email Sending: Edit"
 *   CONTACT_TO              a verified Email Routing destination address (the company inbox)
 *   CONTACT_FROM            optional; an address on kuriova.com, default forms@kuriova.com
 *
 * Browsers with JavaScript post with "Accept: application/json" and get JSON back;
 * plain form posts are redirected to /contact/sent or /contact/error.
 */

// The repo has no @types/node; this is all the function needs from Node.
declare const process: { env: Record<string, string | undefined> };

// Keep in sync with the <select> in src/pages/contact.astro.
const TOPICS = {
  sponsorship: 'Sponsorship',
  licensing: 'Licensing',
  collaboration: 'Collaboration',
  press: 'Press',
  feedback: 'Feedback or a correction',
  other: 'Something else',
} as const;

type Topic = keyof typeof TOPICS;
type Fields = { name: string; email: string; organisation: string; topic: string; message: string };
type Result = { ok: true } | { ok: false; error: string; fields?: Partial<Record<keyof Fields, string>> };

const MAX = { name: 100, email: 200, organisation: 120, message: 5000 };
const MIN_MESSAGE = 10;
/** A person can't fill the form in less than this; scripts often do. */
const MIN_FILL_MS = 3000;
const EMAIL = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/;

export async function POST(request: Request): Promise<Response> {
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  const reply = (status: number, body: Result): Response =>
    wantsJson
      ? Response.json(body, { status })
      : Response.redirect(new URL(body.ok ? '/contact/sent' : '/contact/error', request.url), 303);

  if (!sameOrigin(request)) return reply(403, { ok: false, error: 'forbidden' });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reply(400, { ok: false, error: 'bad_request' });
  }
  const field = (key: string) => String(form.get(key) ?? '').trim();

  // Bots fill the hidden field or post faster than anyone can type. Tell them it worked.
  const startedAt = Number(field('t'));
  if (field('website') || (startedAt > 0 && Date.now() - startedAt < MIN_FILL_MS)) {
    return reply(200, { ok: true });
  }

  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || 'unknown';
  if (rateLimited(ip)) return reply(429, { ok: false, error: 'rate_limited' });

  const fields: Fields = {
    name: oneLine(field('name')),
    email: field('email'),
    organisation: oneLine(field('organisation')),
    topic: field('topic'),
    message: field('message'),
  };
  const errors = validate(fields);
  if (Object.keys(errors).length > 0) return reply(400, { ok: false, error: 'invalid', fields: errors });

  return (await send(fields)) ? reply(200, { ok: true }) : reply(502, { ok: false, error: 'send_failed' });
}

/** Only accept posts from the page that served the form (production or a preview). */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // some browsers and privacy tools omit it on same-origin posts
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function validate(f: Fields): Partial<Record<keyof Fields, string>> {
  const e: Partial<Record<keyof Fields, string>> = {};
  if (!f.name) e.name = 'Please tell us your name.';
  else if (f.name.length > MAX.name) e.name = `Please keep your name under ${MAX.name} characters.`;
  if (!EMAIL.test(f.email) || f.email.length > MAX.email) e.email = 'Please enter a valid email address.';
  if (f.organisation.length > MAX.organisation) e.organisation = `Please keep this under ${MAX.organisation} characters.`;
  if (!(f.topic in TOPICS)) e.topic = 'Please choose a topic.';
  if (f.message.length < MIN_MESSAGE) e.message = `Please write a little more (at least ${MIN_MESSAGE} characters).`;
  else if (f.message.length > MAX.message) e.message = `Please keep your message under ${MAX.message} characters.`;
  return e;
}

async function send(f: Fields): Promise<boolean> {
  const { CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_EMAIL_TOKEN: token, CONTACT_TO: to } = process.env;
  const from = process.env.CONTACT_FROM || 'forms@kuriova.com';
  if (!account || !token || !to) {
    console.error('Contact form is not configured: set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_EMAIL_TOKEN and CONTACT_TO.');
    return false;
  }

  const topic = TOPICS[f.topic as Topic];
  const who = f.organisation ? `${f.name}, ${f.organisation}` : f.name;
  const text = [
    `Topic: ${topic}`,
    `Name: ${f.name}`,
    `Email: ${f.email}`,
    ...(f.organisation ? [`Organisation: ${f.organisation}`] : []),
    '',
    f.message,
    '',
    '--',
    'Sent from the contact form on kuriova.com. Reply to this email to answer them directly.',
  ].join('\n');

  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/email/sending/send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: { address: from, name: 'kuriova.com contact form' },
        to,
        reply_to: { address: f.email, name: f.name },
        subject: `kuriova.com: ${topic} from ${who}`,
        text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return true;
    console.error(`Cloudflare Email Service refused the message: HTTP ${res.status} ${await res.text()}`);
  } catch (err) {
    console.error(`Cloudflare Email Service could not be reached: ${(err as Error).message}`);
  }
  return false;
}

/** Names and subjects stay on one line. */
function oneLine(s: string): string {
  return s.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ');
}

// A light brake on floods: at most 5 messages per address per 10 minutes on each
// running instance. Instances are reused under Fluid Compute, so this catches loops.
const WINDOW_MS = 10 * 60_000;
const recent = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5000) recent.clear();
  return hits.length > 5;
}
