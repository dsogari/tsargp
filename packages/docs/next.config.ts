import type { NextConfig } from 'next';
import nextra from 'nextra';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';

const withNextra = nextra({
  // ... Your additional nextra config
});

const baseConfig: NextConfig = {
  webpack(config) {
    const allowedSvgRegex = /\.svg$/i;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fileLoaderRule = config.module.rules.find((rule: any) => rule.test?.test?.('.svg'));
    config.module.rules.push(
      {
        // Reapply the existing rule, but only for svg imports ending in ?url
        ...fileLoaderRule,
        test: allowedSvgRegex,
        resourceQuery: /url/, // *.svg?url
      },
      {
        // Convert all other *.svg imports to React components
        test: allowedSvgRegex,
        issuer: fileLoaderRule.issuer,
        resourceQuery: { not: [...fileLoaderRule.resourceQuery.not, /url/] }, // exclude if *.svg?url
        use: ['@svgr/webpack'],
      },
    );
    fileLoaderRule.exclude = allowedSvgRegex;
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

const prodConfig: NextConfig = {
  ...baseConfig,
  basePath: '/tsargp',
  output: 'export',
  distDir: 'dist',
  images: {
    unoptimized: true,
  },
};

/** @ignore */
export default function (phase: string) {
  return withNextra(phase == PHASE_PRODUCTION_BUILD ? prodConfig : baseConfig);
}
