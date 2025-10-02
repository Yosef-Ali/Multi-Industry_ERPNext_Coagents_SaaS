/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode
  reactStrictMode: true,

  // Environment variables (client-side only, don't put secrets here)
  env: {
    NEXT_PUBLIC_COPILOT_ENDPOINT: '/api/copilotkit',
  },
};

module.exports = nextConfig;
