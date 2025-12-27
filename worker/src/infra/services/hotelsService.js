import { withRetries } from './serviceHelpers';
import { FetchClient } from '../http/fetchClient';

export class HotelsService {
	constructor({ hl, currency, api_key, timeoutMs, logger } = {}) {
		if (!api_key) throw new Error('api_key is required');
		this.hl = hl || 'en';
		this.currency = currency || 'EUR';
		this.api_key = api_key || '';
		this.apiUrl = 'https://serpapi.com/search.json';
		this.engine = 'google_hotels';
		this.timeoutMs = timeoutMs || 20000;
		this.logger = logger;
	}

	async get({ to, travellers, start, end }) {
		const step = 'HotelsService.get';

		if (!(to && travellers && start && end)) throw new Error('Invalid parameters');

		const url = new URL(this.apiUrl);
		url.searchParams.set('engine', this.engine);
		url.searchParams.set('api_key', this.api_key);
		url.searchParams.set('hl', this.hl);
		url.searchParams.set('currency', this.currency);
		url.searchParams.set('q', to);
		url.searchParams.set('check_in_date', start);
		url.searchParams.set('check_out_date', end);
		url.searchParams.set('adults', travellers);
		url.searchParams.set('children', 0);

		const headers = { accept: 'application/json' };

		try {
			const hotelsData = await withRetries(async () => {
				const reqHandler = await new FetchClient({ headers, apiUrl: url.toString() });
				const json = await reqHandler.handle(this.timeoutMs);

				if (!json) {
					const e = new Error(`Fetching hotels data failed`);
					e.code = 'REMOTE_API_ERROR';
					throw e;
				}

				return json;
			});

			const { ads } = hotelsData;
			if (!Array.isArray(ads) || ads.length === 0) {
				const e = new Error('No hotels data found');
				e.code = 'NOT_FOUND';
			}

			return hotelsData;
		} catch (err) {
			this.logger?.logError?.(step, err.message, { code: err.code, status: err.status });
			throw err;
		}
	}
}
