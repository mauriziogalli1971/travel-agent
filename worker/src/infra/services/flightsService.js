import { withRetries } from './serviceHelpers';
import { FetchClient } from '../http/fetchClient';

export class FlightsService {
	constructor({ hl, currency, api_key, timeoutMs, logger } = {}) {
		if (!api_key) throw new Error('api_key is required');
		this.hl = hl || 'en';
		this.currency = currency || 'EUR';
		this.api_key = api_key || '';
		this.apiUrl = 'https://serpapi.com/search.json';
		this.engine = 'google_flights';
		this.timeoutMs = timeoutMs || 20000;
		this.logger = logger;
	}

	async get({ fromIata, toIata, start, end }) {
		const step = 'FlightsService.get';

		if (!(fromIata && toIata && start && end)) throw new Error('Invalid parameters');

		const url = new URL(this.apiUrl);
		url.searchParams.set('engine', this.engine);
		url.searchParams.set('api_key', this.api_key);
		url.searchParams.set('hl', this.hl);
		url.searchParams.set('currency', this.currency);
		url.searchParams.set('departure_id', fromIata);
		url.searchParams.set('arrival_id', toIata);
		url.searchParams.set('outbound_date', start);
		url.searchParams.set('return_date', end);

		const headers = { accept: 'application/json' };

		try {
			const flightsData = await withRetries(async () => {
				const reqHandler = await new FetchClient({ headers, apiUrl: url.toString() });
				const json = await reqHandler.handle(this.timeoutMs);

				if (!json) {
					const e = new Error(`Fetching flights data failed`);
					e.code = 'REMOTE_API_ERROR';
					throw e;
				}

				return json;
			});

			const { best_flights, other_flights, airports } = flightsData;
			if (
				!(
					Array.isArray(best_flights) &&
					best_flights.length > 0 &&
					Array.isArray(other_flights) &&
					other_flights.length > 0 &&
					Array.isArray(airports) &&
					airports.length > 0
				)
			) {
				const e = new Error('No flights data found');
				e.code = 'NOT_FOUND';
				throw e;
			}

			return flightsData;
		} catch (err) {
			this.logger?.logError?.(step, err.message, { code: err.code, status: err.status });
			throw err;
		}
	}
}
