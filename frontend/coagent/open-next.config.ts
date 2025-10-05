// OpenNext config for Cloudflare (without R2 cache for now)
import { defineCloudflareConfig } from '@opennextjs/cloudflare/config';

export default defineCloudflareConfig({
	// Skip R2 cache for free tier deployment
});
