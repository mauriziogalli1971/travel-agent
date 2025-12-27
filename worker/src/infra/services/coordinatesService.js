import { FetchClient } from '../http/fetchClient';
import { withRetries } from './serviceHelpers';
import { isValidCoords } from '../../utils/validators';
import { NotFoundError, RemoteApiError, ValidationError } from '../../domain/errors';

export class CoordinatesService {
	/**
	 * @param {{ logger?: any, baseUrl?: string }} deps
	 */
	constructor({ logger } = {}) {
		this.logger = logger;
		this.baseUrl = 'https://nominatim.openstreetmap.org/search';
	}

	/**
	 * Resolve coordinates from a place name.
	 * @param {string} place
	 * @returns {Promise<{ lat:number, lon:number }>}
	 */
	async get(place) {
		const step = 'CoordinatesService.get';
		const q = this.#normalizePlace(place);

		// Basic validation
		if (!q) {
			throw new ValidationError('Place is required');
		}

		const url = new URL(this.baseUrl);
		url.searchParams.set('q', q);
		url.searchParams.set('limit', '1');
		url.searchParams.set('format', 'json');

		const timeoutMs = 8000;
		const headers = {
			'User-Agent': 'Travel Agent/1.0 (https://travel-agent.pages.dev/)',
			'Accept-Language': 'en',
			accept: 'application/json',
		};

		try {
			const data = await withRetries(async () => {
				const reqHandler = new FetchClient({ headers, apiUrl: url.toString() });
				const json = await reqHandler.handle(timeoutMs);

				if (!json) {
					throw new RemoteApiError('CoordinatesService - fetching coordinates failed.', `No data returned for place: ${q}`);
				}

				return json;
			});

			const [first] = Array.isArray(data) ? data : [];
			const coordinates = { lat: parseFloat(first.lat), lon: parseFloat(first.lon) };
			if (!isValidCoords(coordinates.lat, coordinates.lon)) {
				throw new NotFoundError('No coordinates found', { place });
			}

			this.logger?.logInfo?.(step, `CoordinatesService - resolved coordinate for place: ${place}`, coordinates);

			return coordinates;
		} catch (err) {
			this.logger?.logError?.(step, err.message, { code: err.code, status: err.status });
			throw err;
		}
	}

	#normalizePlace(place) {
		return String(place ?? '').trim();
	}
}
