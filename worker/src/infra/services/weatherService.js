import { withRetries } from './serviceHelpers';
import { FetchClient } from '../http/fetchClient';
import { NotFoundError, RemoteApiError } from '../../domain/errors';

export class WeatherService {
	constructor({ api_key, timeoutMs, logger } = {}) {
		this.baseUrl = 'https://api.openweathermap.org/data/3.0/onecall';
		this.api_key = api_key || '';
		this.timeoutMs = timeoutMs || 20000;
		this.logger = logger;
	}

	async get({ lat, lon } = {}) {
		const step = 'WeatherService.get';

		if (!(lat && lon)) throw new Error('Invalid parameters');

		const url = new URL(this.baseUrl);
		url.searchParams.set('lat', lat);
		url.searchParams.set('lon', lon);
		url.searchParams.set('appid', this.api_key);

		const headers = { accept: 'application/json' };

		try {
			const weatherData = await withRetries(async () => {
				const reqHandler = new FetchClient({ headers, apiUrl: url.toString() });
				const json = await reqHandler.handle(this.timeoutMs);

				if (!json) {
					throw new RemoteApiError(`Fetching weather data failed`);
				}

				return json;
			});

			const { daily } = weatherData;
			if (!(Array.isArray(daily) && daily.length > 0)) {
				throw new NotFoundError('No weather data found');
			}

			return weatherData;
		} catch (err) {
			this.logger?.logError?.(step, err.message, { code: err.code, status: err.status });
			throw err;
		}
	}
}
