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

For a Git-integrated Cloudflare Pages project, connect the repo and set:

| Setting | Value |
|---|---|
| Framework preset | Next.js (Static HTML Export) |
| Build command | `npm run build` |
| Build output directory | `out` |
| Node version | `24.18.0` (read from `.nvmrc`) |

Leave any separate deploy command blank. Pages' Git integration automatically
uploads the contents of `out` after the build. Do **not** use `npx wrangler
deploy` here: that is the Workers/OpenNext deployment path and expects a
`.next/standalone` server bundle, which this static export intentionally does
not produce.

For a manual Pages deployment, run `npm run build` followed by
`npm run deploy:pages` (or `npx wrangler pages deploy ./out
--project-name textfolio`). The checked-in `wrangler.jsonc` records `out` as the
Pages build directory. Cloudflare Pages has no API routes, middleware, server
actions, image optimisation server, or environment variables in this project.

The tuning panel is hidden in production builds. A `.nvmrc` pins the Node
version so the build environment does not drift between deploys.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
