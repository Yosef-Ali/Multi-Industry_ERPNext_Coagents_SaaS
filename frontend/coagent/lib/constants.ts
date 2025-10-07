export const isProductionEnvironment = process.env.NODE_ENV === 'production';
export const isDevelopmentEnvironment = process.env.NODE_ENV === 'development';
export const isTestEnvironment = Boolean(
	process.env.PLAYWRIGHT_TEST_BASE_URL || process.env.PLAYWRIGHT || process.env.CI_PLAYWRIGHT
);

// Dummy password for timing attack prevention during authentication
export const DUMMY_PASSWORD = '$2a$10$dummyhashedpasswordtopreventtimingattacks1234567890';
