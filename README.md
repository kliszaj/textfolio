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

## Deploying to Cloudflare Workers Builds

Every route prerenders, so `next build` emits a plain static site and no
adapter or server runtime is needed. `next.config.ts` sets `output: "export"`,
and `generateStaticParams` in `app/work/[slug]/page.tsx` builds a page per case
study.

This static export is deployed with Cloudflare Workers Builds and Workers Static
Assets. Connect the repo to a Workers application and set:

| Setting | Value |
|---|---|
| Framework preset | None (static site) |
| Build command | `npm run build` |
| Production deploy command | `npx wrangler deploy` (or `npm run deploy`) |
| Version command | `npx wrangler versions upload` |
| Root directory | `/` |
| Node version | `24.18.0` (read from `.nvmrc`) |

`wrangler.jsonc` points the Worker Static Assets directory at `./out`, so
`npx wrangler deploy` uploads the generated export directly. The non-production
version command is the Workers Builds preview command. Do not use the old
`pages_build_output_dir` setting or `wrangler pages deploy` in this integrated
Workers setup; this app is static and does not need OpenNext or vinext.

For a manual deployment, run `npm run build` followed by `npm run deploy`. The
checked-in `wrangler.jsonc` records `out` as the Worker Static Assets directory.
There are no API routes, middleware, server actions, image optimisation server,
or environment variables in this project.

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
