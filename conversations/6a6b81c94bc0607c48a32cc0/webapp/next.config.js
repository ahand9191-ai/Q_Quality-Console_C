/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow PDF uploads up to 20MB
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
    serverExternalPackages: ['exceljs'],
  },
};

module.exports = nextConfig;
