/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	env: {
		NEXT_PUBLIC_COPILOT_ENDPOINT: '/api/copilotkit',
	},
	images: {
		unoptimized: true,
	},
};

module.exports = nextConfig;
