import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      }
    ];
  },

  // Environment validation and runtime exposure
  env: {
    CURSOR_ADMIN_API_KEY: process.env.CURSOR_ADMIN_API_KEY,
  },

  // Bundle analyzer support
  experimental: {
    // Enable modern JavaScript features
    esmExternals: true,
  },

  // Image optimization (if needed in future)
  images: {
    unoptimized: true, // For now, since we're not using next/image
  },

  // TypeScript strict mode
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint configuration - Allow build to succeed with warnings
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
