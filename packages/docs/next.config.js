import nextra from 'nextra';
import { PHASE_PRODUCTION_BUILD } from 'next/constants.js';

// eslint-disable-next-line jsdoc/check-tag-names
/** @type {import('nextra').NextraConfig} */
const nextraConfig = {};
const withNextra = nextra(nextraConfig);

// eslint-disable-next-line jsdoc/check-tag-names
/** @type {import('next').NextConfig} */
const baseConfig = {
  webpack(config) {
    const allowedSvgRegex = /\.svg$/i;
    const fileLoaderRule = config.module.rules.find((rule) => rule.test?.test?.('.svg'));
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

/** @ignore */
export default function (phase) {
  if (phase === PHASE_PRODUCTION_BUILD) {
    // eslint-disable-next-line jsdoc/check-tag-names
    /** @type {import('next').NextConfig} */
    const nextConfig = {
      ...baseConfig,
      basePath: '/tsargp',
      output: 'export',
      distDir: 'dist',
      images: {
        unoptimized: true,
      },
    };
    return withNextra(nextConfig);
  }
  return withNextra(baseConfig);
}
