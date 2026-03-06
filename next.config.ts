import type { NextConfig } from "next";
import crypto from 'crypto';

const nextConfig: NextConfig = {
  // Tree-shake barrel exports for smaller bundles
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'date-fns'],
  },

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  
  // Configure webpack for optimal code splitting
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Client-side bundle optimization
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Framework chunk (React, React-DOM, etc.)
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // Libraries chunk (large npm packages)
            lib: {
              test(module: any) {
                return module.size() > 160000 && /node_modules/.test(module.identifier());
              },
              name(module: any) {
                const hash = crypto.createHash('sha1');
                hash.update(module.identifier());
                return `lib-${hash.digest('hex').substring(0, 8)}`;
              },
              priority: 30,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            // Common modules shared between pages
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 20,
              reuseExistingChunk: true,
            },
            // Shared modules (for better caching)
            shared: {
              name(module: any, chunks: any[]) {
                const hash = crypto.createHash('sha1');
                hash.update(chunks.reduce((acc, chunk) => acc + chunk.name, ''));
                return `shared-${hash.digest('hex').substring(0, 8)}`;
              },
              priority: 10,
              minChunks: 2,
              reuseExistingChunk: true,
            },
          },
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
        },
      };
      
      // Optimize module IDs for better long-term caching
      config.optimization.moduleIds = 'deterministic';
      
      // Enable tree shaking for all modules
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }
    
    return config;
  },
  
  
  // Configure compression
  compress: true,
  
  // Enable production source maps for debugging (can be disabled for smaller builds)
  productionBrowserSourceMaps: false,
};

export default nextConfig;
