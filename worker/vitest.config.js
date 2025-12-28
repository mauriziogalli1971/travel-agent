// noinspection JSCheckFunctionSignatures

import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	test: {
		include: ['/test/test-coordinates-service.js'],
		inline: false,
		threads: false,
		reporters: 'default',
		poolOptions: {
			workers: {
				wrangler: { configPath: './wrangler.jsonc' },
			},
		},
	},
});
