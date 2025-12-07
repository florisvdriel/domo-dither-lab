/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,  // Since images are handled via canvas
  },
};

module.exports = nextConfig;

