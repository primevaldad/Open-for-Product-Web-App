/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    // This will force the build to succeed even if there are TypeScript errors.
    ignoreBuildErrors: true,
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
};

module.exports = nextConfig;
