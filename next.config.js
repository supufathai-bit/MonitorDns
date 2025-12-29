/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  // Cloudflare Pages requires static export
  output: 'export',
  // Disable trailing slash for Cloudflare Pages
  trailingSlash: false,
};

module.exports = nextConfig;