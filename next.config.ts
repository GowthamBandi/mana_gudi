import type { NextConfig } from "next";

/**
 * Static export.
 *
 * The Firebase project has no billing account, so Cloud Functions and App
 * Hosting (which back Next.js SSR on Firebase) are unavailable. Rather than
 * leave the project undeployable, the site is exported as static HTML and all
 * data is fetched in the browser through the Firebase client SDK, with the
 * security rules doing the authorization. This keeps the whole platform on the
 * free tier without weakening any security property.
 *
 * Consequence: detail views use query parameters (/verify?ref=…) rather than
 * dynamic path segments, since those cannot be pre-rendered for data that does
 * not exist at build time.
 */
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: false,
  // Type errors must fail the build — a temple ledger is not a place to ship
  // code that only "probably" compiles.
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
