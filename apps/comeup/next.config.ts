import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // There are lockfiles above this directory, so Next guesses the home folder
  // as the workspace root and traces far more than it should. Pin it here.
  outputFileTracingRoot: __dirname,
  async rewrites() {
    return [
      // Next ignores dot-prefixed folders inside `app/`, so the well-known MCP
      // descriptor is served by a normal route handler behind a rewrite.
      { source: "/.well-known/mcp.json", destination: "/api/well-known/mcp" },
    ];
  },
  async headers() {
    return [
      {
        // The agent layer is the point of this product, so the public JSON is
        // open by default rather than same-origin only.
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type,Authorization" },
        ],
      },
      {
        source: "/llms.txt",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];
  },
};

export default nextConfig;
