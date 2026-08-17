import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone with a self-contained server.js and only the
  // node_modules actually traced as reachable — that is what the Docker
  // `runner` stage copies, and why the final image stays small.
  output: "standalone",

  // Next 16 writes AGENTS.md / CLAUDE.md into the project on dev start; this
  // keeps generated agent scaffolding out of the repo.
  agentRules: false,
};

export default nextConfig;
