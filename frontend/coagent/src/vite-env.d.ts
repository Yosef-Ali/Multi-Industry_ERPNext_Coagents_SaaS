/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_GATEWAY_URL: string;
	readonly VITE_AUTH_TOKEN: string;
	readonly DEV: boolean;
	readonly PROD: boolean;
	readonly MODE: string;
	// Add more env variables as needed
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
