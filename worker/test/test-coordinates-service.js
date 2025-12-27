// JavaScript
import { describe, expect, it, vi } from 'vitest';
import { CoordinatesService } from '../src/infra/services/coordinatesService.js';

// Mock FetchClient used inside the service
vi.mock('../src/infra/http/fetchClient.js', () => ({
	FetchClient: class {
		constructor({ apiUrl }) {
			this.apiUrl = apiUrl;
		}
		async handle() {
			// return a shape similar to Nominatim
			return [{ lat: '48.8566', lon: '2.3522' }];
		}
	},
}));

// Mock withRetries passthrough
vi.mock('../src/infra/services/serviceHelpers.js', () => ({
	withRetries: async (fn) => fn(),
}));

describe('CoordinatesService', () => {
	it('returns parsed coordinates', async () => {
		const svc = new CoordinatesService({});
		const res = await svc.get('Paris');
		expect(res).toEqual({ lat: 48.8566, lon: 2.3522 });
	});

	it('rejects on empty place', async () => {
		const svc = new CoordinatesService({});
		await expect(svc.get('')).rejects.toBeTruthy();
	});
});
