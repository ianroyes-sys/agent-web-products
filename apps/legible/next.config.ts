import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // This app lives in a monorepo under a home directory that also contains a
  // lockfile. Pin the tracing root or Next walks up and traces the wrong tree.
  outputFileTracingRoot: import.meta.dirname,
  async headers() {
    return [
      {
        // We sell agent legibility, so our own surfaces have to be readable
        // by an agent that arrives without a browser.
        source: "/llms.txt",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];
  },
};

export default nextConfig;
