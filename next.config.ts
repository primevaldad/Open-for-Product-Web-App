import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // This will force the build to succeed even if there are TypeScript errors.
    ignoreBuildErrors: true,
  },
  eslint: {
    // This will skip ESLint checks during the build process.
    ignoreDuringBuilds: true,
  },
  images: {
    loader: 'custom',
    loaderFile: './loader.js',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  transpilePackages: ['lucide-react'],
};

export default nextConfig;
