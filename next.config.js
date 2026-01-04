/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,  // Since images are handled via canvas
  },
  webpack: (config, { isServer }) => {
    // Ensure proper handling of Web Workers
    if (!isServer) {
      config.output.publicPath = `/_next/`;
      config.output.workerPublicPath = `/_next/`;
    }

    return config;
  },
};

module.exports = nextConfig;

