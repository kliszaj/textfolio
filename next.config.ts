import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every route is prerenderable, so the build emits a plain static site into
  // ./out. That is what Cloudflare Pages serves directly, with no adapter and
  // no server runtime to configure.
  output: "export",
  images: {
    // The static export has no image optimisation server behind it.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "m.media-amazon.com",
        pathname: "/images/I/**",
      },
      {
        protocol: "https",
        hostname: "www.studentapan.se",
        pathname: "/images/**",
      },
    ],
  },
};

export default nextConfig;
