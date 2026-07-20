# Foster / Boatek Labs — Portfolio Website

A premium, motion-driven portfolio site built with vanilla HTML/CSS/JS on the
frontend and Node.js/Express on the backend. Dark-navy design system,
installable as a PWA, deployable on Termux.

## Stack

- HTML5, CSS3, vanilla JavaScript (no frameworks)
- Node.js + Express (contact form API, static hosting)
- Nodemailer (contact form email delivery)
- Service worker + Web App Manifest (installable, works offline)

## Folder structure

```
portfolio/
├── index.html
├── resume.html
├── blog.html
├── admin.html
├── manifest.json
├── sw.js
├── offline.html
├── install.sh
├── robots.txt
├── sitemap.xml
├── vercel.json          (Vercel routing + security headers)
├── package.json         (root — used by Vercel to install API deps)
├── .env.example
├── api/
│   └── index.js         (Vercel serverless function — wraps server/server.js)
├── lib/
│   └── dataStore.js     (KV/file/in-memory storage abstraction, see "Deploying to Vercel")
├── css/
│   ├── style.css
│   ├── animations.css
│   ├── responsive.css
│   ├── features.css
│   └── admin.css
├── js/
│   ├── main.js
│   ├── animations.js
│   ├── particles.js
│   ├── features.js
│   ├── growth.js       (booking, testimonials, case studies, deposits)
│   ├── blog.js
│   ├── admin.js
│   ├── theme-init.js   (pre-paint theme flash prevention, shared across pages)
│   └── resume.js
├── images/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-maskable-512.png
└── server/
    ├── server.js         (Express app — also used locally/on Termux via `node server.js`)
    ├── package.json      (local/Termux dev dependencies)
    ├── .env.example
    ├── routes/{contact,stats,booking,testimonials,blog,payments,admin}.js
    ├── controllers/{contact,booking,testimonials,blog,payments}Controller.js
    ├── middleware/{validateContact,adminAuth}.js
    ├── services/{emailService,telegramService,paystackService}.js
    ├── utils/asyncHandler.js
    └── config/{mailer,queueStore,statsStore,bookingStore,testimonialStore,blogStore,paymentStore}.js
```

## Contact channels

- **Email:** boateklabs@gmail.com
- **Phone / WhatsApp DM:** +233 53 704 5514
- **WhatsApp Group:** https://chat.whatsapp.com/Lwqd1vUnb4IHvlBtaA9sjX

These are wired into the footer, the contact section, and a floating WhatsApp
button on every page.

## Hire Me queue system

Every contact form submission is recorded in `server/data/queue.json`
(auto-created on first run — lowdb-style flat-file persistence, no external
DB). The applicant's position in the pending queue is:

- shown on the contact page as a live "X people ahead of you" banner
  (`GET /api/contact/queue/status`)
- included in the success message after submitting
- included in both emails sent (see below)

## Dynamic project types & budgets

`data/projectBudgets.json` is the single source of truth for project types
and their budget ranges, and is used by **both** the frontend (fetched
directly, powers the budget dropdown) and the backend (validates
submissions). Selecting a project type repopulates the budget dropdown with
ranges appropriate to that project (e.g. Game Development budgets differ
from Landing Page budgets).

**Tamper protection:** the server independently re-validates that the
submitted budget key actually belongs to the submitted project type. If
someone edits the form in devtools to submit a mismatched pair, the request
is rejected with a 422 — the pairing can't be gamed client-side.

## Currency detection

The budget dropdown detects the visitor's country via IP geolocation
(`ipwho.is`, no API key required) and displays each range converted to
their local currency using static approximate rates in
`data/projectBudgets.json`. This is **display-only** — the underlying value
submitted is always the USD range key, and final quotes are agreed in USD.
The conversion rates are hardcoded approximations, not live forex data;
update `currencyRates` periodically or swap in a live FX API if you need
production-grade accuracy. If geolocation fails (offline, blocked, etc.) it
silently falls back to USD.

## Contact form emails

Each submission triggers two emails:
1. **Admin notification** to `CONTACT_TO_EMAIL`, with full inquiry details and queue position.
2. **Applicant auto-reply**, a designed confirmation email with their queue position and a WhatsApp group invite.

Both share a common dark/branded HTML template (see
`server/controllers/contactController.js`).

### Email delivery: Resend (recommended) + SMTP fallback

Sending is handled by `server/services/emailService.js`, which tries
**Resend's HTTPS API** first (if `RESEND_API_KEY` is set), then falls back to
direct **SMTP via Nodemailer**.

This matters specifically for Termux/Android and mobile-carrier deployments:
raw SMTP (ports 587/465) is very commonly blocked by mobile networks, which
produces an error like:

```
[contact] Failed to send email: Greeting never received
```

That means the connection never even got the mail server's opening
response — a blocked/dropped connection, not a bad password, so retrying the
same SMTP settings won't fix it. Resend sends over HTTPS (port 443), the same
port every normal web request uses, so it isn't affected by this.

**To set it up:**
1. Create a free account at [resend.com](https://resend.com) and generate an API key.
2. In `server/.env`, set:
   ```
   RESEND_API_KEY=re_your_key_here
   RESEND_FROM="Boatek Labs <onboarding@resend.dev>"
   ```
3. Leave the `SMTP_*` variables filled in too (optional) — they'll only be
   used automatically if a Resend send ever fails.

If you'd rather use SMTP only, just leave `RESEND_API_KEY` blank; `mailer.js`
now also auto-corrects the `secure`/port combination and adds connection
timeouts so failures surface in seconds instead of hanging.

## Deploying to Vercel

The site deploys as a single project: static frontend files (served directly
by Vercel's CDN) plus the existing Express API, wrapped as one serverless
function at `api/index.js`. No rewrite of the backend was needed.

1. Push this project to a Git repo and import it in Vercel (or run `vercel`
   from this folder with the Vercel CLI). Vercel auto-detects the root
   `package.json` and `api/index.js` — no framework preset needed.
2. In the Vercel project settings → **Environment Variables**, add whichever
   of the variables in `.env.example` you need (email delivery, admin
   dashboard, Telegram, Paystack). These are the same variables used
   locally/on Termux — Vercel injects them directly, `.env` files aren't
   used in production.
3. **Persistence:** blog posts, bookings, testimonials, payments, the hire-me
   queue, and visit stats are stored as small JSON documents. Locally and on
   Termux this still writes to `server/data/*.json`, exactly as before.
   Vercel's filesystem is read-only, so in production the app automatically
   switches to **Vercel KV** (Storage tab → Create Database → KV in your
   Vercel project) — connecting it injects `KV_REST_API_URL` and
   `KV_REST_API_TOKEN` automatically and nothing else needs to change. If you
   skip this step the site still works, but that data resets on every cold
   start. See `lib/dataStore.js` for the full explanation and how to swap in
   Supabase/Postgres/Firebase/MongoDB Atlas instead if you'd rather use one
   of those.
4. Deploy. `GET /api/health` is a quick way to confirm the function is live.

Local/Termux development is unaffected by any of this — `bash install.sh`
and `cd server && node server.js` work exactly as they did before.

## Running locally / on Termux

```bash
bash install.sh
cd server
node server.js
```

Then open `http://localhost:3000`.

Before the contact form can send real emails, edit `server/.env` (created
from `.env.example` by the install script). Recommended (works reliably on
Termux/mobile networks):

```
RESEND_API_KEY=re_your_key_here
RESEND_FROM="Boatek Labs <onboarding@resend.dev>"
CONTACT_TO_EMAIL=boateklabs@gmail.com
```

Or, SMTP only:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
CONTACT_TO_EMAIL=boateklabs@gmail.com
```

For Gmail, `SMTP_PASS` must be an **App Password**, not your normal account
password (Google account → Security → App passwords).

## PWA

The site registers a service worker (`sw.js`) that precaches the core shell
and serves an offline fallback (`offline.html`) when there's no connection.
`manifest.json` makes it installable on Android/iOS/desktop with a themed
splash screen and home-screen icon.

## Customizing content

- Hero stats, testimonials, and project cards in `index.html` are currently
  placeholder copy — replace with your real numbers, quotes, and project
  links/screenshots.
- Swap `images/icon-*.png` for your own branding if desired (same sizes:
  192×192, 512×512, and a 512×512 maskable variant).
- `resume.html` is a standalone, printable résumé page (opens from the hero
  "Resume" button — uses the browser's own Print → Save as PDF). Edit its
  content directly; it doesn't depend on any other file.

## New features (js/features.js + css/features.css)

All additive — none of the existing `main.js`/`animations.js` behavior was
changed.

- **Light / dark theme toggle** — persisted, no flash-of-wrong-theme on load
- **Command palette** (`Ctrl/Cmd+K` or the search icon in the nav) — jump to
  any section or run quick actions (copy email, open resume, toggle theme…)
- **Keyboard shortcuts panel** — press `?` to see them
- **Live greeting badge** in the hero, based on time of day in Ghana
- **Animated skill proficiency bars** on each skill card
- **Live GitHub stats widget** below the skills grid — **set your real
  username** in `data-github-user` on `#githubStats` in `index.html` (it's
  currently a placeholder)
- **Project search + tag filter** above the projects grid
- **Copy-email button** on the contact card, with a toast confirmation
- **Share row** in the footer (copy link, X, LinkedIn, WhatsApp)
- **Visitor counter** in the footer, backed by `server/routes/stats.js` and
  `server/data/stats.json` (auto-created, same flat-file pattern as the
  queue store)
- **Accessibility toolbar** (bottom-right icon) — text size, high contrast,
  and an independent "reduce motion" switch, all persisted
- **Online/offline status toast**
- **Contact form draft autosave** — typed-but-unsent messages are restorable
  after a refresh, and cleared automatically on successful submission
- **Confetti burst** on a successful contact form submission
- **Konami code easter egg** (`↑ ↑ ↓ ↓ ← → ← → b a`)

## Business, admin, and SEO features

### Admin dashboard (`admin.html`)

A password-protected dashboard to manage everything without touching email
or a database directly:

- **Overview** — total visits, a 14-day visit chart, pending counts
- **Inquiries** — every "Hire Me" submission
- **Bookings** — call requests, with a status dropdown (pending/confirmed/cancelled)
- **Testimonials** — approve, reject, or delete submitted testimonials.
  Only **approved** ones appear on the public site.
- **Blog** — create/edit/delete posts, toggle published/draft
- **Payments** — every verified Paystack deposit

**Setup:** set `ADMIN_USER` and `ADMIN_PASS` in `server/.env`, then visit
`/admin.html` and sign in. Without those two variables set, the dashboard
API returns 503 and stays inaccessible. There's no link to it anywhere on
the public site — bookmark the URL directly. `robots.txt` also blocks it
from being indexed.

### Booking, testimonials, and case studies (public site)

- **"Book a Call"** button in the hero opens a modal → `POST /api/booking`
  → stored, emailed, and (if configured) Telegram-notified
- **"Leave a Testimonial"** button in the Testimonials section → submissions
  are `pending` until approved in the admin dashboard, then appear in a
  "community testimonials" grid below the curated slider
- **"Case Study"** button on every project card opens a modal with
  Problem/Approach/Result. The current content is **placeholder text** for
  the demo projects — replace `data-case-problem` / `data-case-approach` /
  `data-case-result` on each `.project-card` in `index.html` with real
  details (and real numbers) once these become actual client projects.
  Don't leave placeholder copy live — it says exactly that it's a
  placeholder.

### Deposit payments (Paystack)

A "Ready to start?" panel at the bottom of Services lets a client pay a
deposit via Paystack's popup. Setup:

```
PAYSTACK_PUBLIC_KEY=pk_...
PAYSTACK_SECRET_KEY=sk_...
```

The public key is exposed to the frontend via `GET /api/config` (safe — it's
meant to be public). The secret key never leaves the server; every payment
is re-verified server-side via `services/paystackService.js` before being
recorded, so a client can't fake a successful payment from the browser.
Without these two variables set, the "Pay Deposit" button disables itself
automatically.

### Blog (`blog.html`)

A minimal blog with no database or markdown engine — posts are authored as
HTML directly in the admin dashboard's post editor and stored in
`server/data/blog.json`. `blog.html` lists published posts;
`blog.html?post=your-slug` shows one.

### Telegram notifications (optional)

Get a push notification the moment a new inquiry, booking, testimonial, or
payment comes in — faster to notice on a phone than email.

1. Message [@BotFather](https://t.me/BotFather) on Telegram, create a bot, copy the token.
2. Message your new bot once (anything), then visit
   `https://api.telegram.org/bot<token>/getUpdates` and copy your `chat.id`.
3. Set both in `server/.env`:
   ```
   TELEGRAM_BOT_TOKEN=
   TELEGRAM_CHAT_ID=
   ```

Leave these blank and nothing changes — notifications just don't fire.

### Spam protection

The contact, booking, and testimonial forms all include a honeypot field
(invisible to real visitors, irresistible to bots that auto-fill every
input). A filled honeypot is treated as spam and silently discarded.

### SEO

- JSON-LD structured data (`Person` + `WebSite`) in `index.html`'s `<head>`
- `robots.txt` and `sitemap.xml` — **update the placeholder domain
  (`boateklabs.dev`) in both files, plus the JSON-LD `url` field, once you
  know your real deployed domain**
- `/admin.html` and `/api/*` are excluded from crawling
