This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Deploying to Cloudflare Pages

Every route prerenders, so `next build` emits a plain static site and no
adapter or server runtime is needed. `next.config.ts` sets `output: "export"`,
and `generateStaticParams` in `app/work/[slug]/page.tsx` builds a page per case
study.

In the Cloudflare Pages dashboard, connect the repo and set:

| Setting | Value |
|---|---|
| Framework preset | None (or "Next.js (Static HTML Export)") |
| Build command | `npm run build` |
| Build output directory | `out` |
| Node version | 20 or newer (`NODE_VERSION` environment variable) |

Nothing else is required: there are no API routes, no middleware, no server
actions, no image optimisation, and no environment variables.

Two things to know before the first deploy:

- **Fonts.** `app/fonts/` holds commercial Pangram Pangram files. Publishing
  the repo publishes them; resolve the licence before the repo is public.
- **Dev-only routes.** The tuning panel and `/prototypes/focus` are hidden in
  production builds, but the prototype route is still emitted as a page. Delete
  it once the focus transition is settled.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
