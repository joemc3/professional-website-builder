/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Output to user-data/generated-site (relative to src-generator)
  // Note: This will be '../user-data/generated-site' from src-generator directory
  distDir: '../user-data/generated-site',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig
