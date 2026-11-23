import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: { "*": ["tools/**", ".agents/**", "content/**"] },
  async rewrites() {
    return [{ source: "/luyen-part-:n(\\d)-toeic", destination: "/luyen-de-toeic/part/:n" }];
  },
};

export default nextConfig;
