import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Several lockfiles exist above this directory; pin the trace root so Next
  // does not guess the home directory as the workspace.
  outputFileTracingRoot: path.join(process.cwd()),
  // The refinery output is read with fs at runtime rather than imported, so
  // it has to be traced explicitly into the serverless bundle.
  outputFileTracingIncludes: {
    "/**": ["./src/data/**"],
  },
  async rewrites() {
    return [
      // Next ignores dot-prefixed folders in `app/`, so the well-known
      // descriptor is served by a normal route handler behind a rewrite.
      { source: "/.well-known/mcp.json", destination: "/api/well-known/mcp" },
    ];
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type,X-API-Key,X-Payment,Authorization",
          },
          { key: "Access-Control-Expose-Headers", value: "X-Payment-Required,X-Index-Generated" },
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
