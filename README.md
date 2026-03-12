# Astro Starter Kit: Blog

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/astro-blog-starter-template)

![Astro Template Preview](https://github.com/withastro/astro/assets/2244813/ff10799f-a816-4703-b967-c78997e8323d)

<!-- dash-content-start -->

Create a blog with Astro and deploy it on Cloudflare Workers as a [static website](https://developers.cloudflare.com/workers/static-assets/).

Features:

- ✅ Minimal styling (make it your own!)
- ✅ 100/100 Lighthouse performance
- ✅ SEO-friendly with canonical URLs and OpenGraph data
- ✅ Sitemap support
- ✅ RSS Feed support
- ✅ Markdown & MDX support
- ✅ Built-in Observability logging

<!-- dash-content-end -->

## Getting Started

Outside of this repo, you can start a new project with this template using [C3](https://developers.cloudflare.com/pages/get-started/c3/) (the `create-cloudflare` CLI):

```bash
npm create cloudflare@latest -- --template=cloudflare/templates/astro-blog-starter-template
```

A live public deployment of this template is available at [https://astro-blog-starter-template.templates.workers.dev](https://astro-blog-starter-template.templates.workers.dev)

## 🚀 Project Structure

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

The `src/content/` directory contains "collections" of related Markdown and MDX documents. Use `getCollection()` to retrieve posts from `src/content/blog/`, and type-check your frontmatter using an optional schema. See [Astro's Content Collections docs](https://docs.astro.build/en/guides/content-collections/) to learn more.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                           | Action                                           |
| :-------------------------------- | :----------------------------------------------- |
| `npm install`                     | Installs dependencies                            |
| `npm run dev`                     | Starts local dev server at `localhost:4321`      |
| `npm run build`                   | Build your production site to `./dist/`          |
| `npm run preview`                 | Preview your build locally, before deploying     |
| `npm run astro ...`               | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help`         | Get help using the Astro CLI                     |
| `npm run build && npm run deploy` | Deploy your production site to Cloudflare        |
| `npm wrangler tail`               | View real-time logs for all Workers              |

## Waitlist (secure)

The landing page form posts to `POST /api/waitlist` server-side.
No API keys are exposed in the browser.

Security controls included:

- Origin allowlist (`ALLOWED_ORIGINS`)
- Email format + length validation
- Honeypot field
- Minimum submit time check
- Optional Cloudflare Turnstile verification

### Provider modes

The API route supports three providers:

- `kit` (ConvertKit/Kit API v4)
- `buttondown`
- `webhook` (custom fallback)

Set with:

```bash
wrangler secret put WAITLIST_PROVIDER
```

Use one of: `kit`, `buttondown`, `webhook`.

If omitted, the route auto-detects by available secrets.

### Kit (ConvertKit)

Required:

```bash
wrangler secret put WAITLIST_KIT_API_KEY
```

Optional:

```bash
wrangler secret put WAITLIST_KIT_FORM_ID
wrangler secret put WAITLIST_KIT_TAG_ID
wrangler secret put WAITLIST_KIT_SEQUENCE_ID
```

### Buttondown

Required:

```bash
wrangler secret put WAITLIST_BUTTONDOWN_API_KEY
```

Optional:

```bash
wrangler secret put WAITLIST_BUTTONDOWN_TAGS
```

`WAITLIST_BUTTONDOWN_TAGS` is comma-separated, e.g. `launch,unframed`.

### Generic webhook fallback

Required:

```bash
wrangler secret put WAITLIST_WEBHOOK_URL
```

Optional:

```bash
wrangler secret put WAITLIST_WEBHOOK_BEARER_TOKEN
```

### Origin + bot protection

```bash
wrangler secret put ALLOWED_ORIGINS
```

Comma-separated origins, e.g.:
`https://unframed.report,https://www.unframed.report`

Optional Turnstile:

```bash
wrangler secret put TURNSTILE_SECRET_KEY
```

## 👀 Want to learn more?

Check out [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Credit

This theme is based off of the lovely [Bear Blog](https://github.com/HermanMartinus/bearblog/).
