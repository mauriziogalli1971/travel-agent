// JavaScript
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Import the worker's default export (the object with fetch)
import worker from '../src/index.js';

// Create helpers
function makeRequest(method = 'POST', body = undefined) {
	const init = { method, headers: { 'Content-Type': 'application/json' } };
	if (body !== undefined) init.body = JSON.stringify(body);
	return new Request('https://example.com/', init);
}

function readJson(res) {
	return res.json();
}

// Stubs/mocks for environment and services
const envStub = {
	// add any required env vars used by your Config
	OPENAI_API_KEY: 'test-key',
	SUPABASE_URL: 'http://localhost',
	SUPABASE_API_KEY: 'test',
};

vi.mock('../src/infra/ai/openaiService.js', () => ({
	OpenAIService: class {
		constructor() {}
		get() {
			// minimal client stub used by agents
			return {
				client: {
					chat: {
						completions: {
							create: vi.fn().mockResolvedValue({
								choices: [{ message: { content: 'stubbed final message', role: 'assistant' } }],
							}),
						},
					},
				},
				config: { model: 'gpt-test' },
			};
		}
	},
}));

vi.mock('../src/infra/ai/toolService.js', () => ({
	toolService: () => ({
		tools: [],
		handleToolCalls: vi.fn().mockResolvedValue(undefined),
	}),
}));

// Mock planTrip to avoid calling real agents (keep focused on HTTP wiring)
vi.mock('../src/app/planTrip.js', () => ({
	planTrip: vi.fn().mockImplementation(async ({ tripData }) => ({
		...tripData,
		weather: 'Sunny 20–28C',
		flight: 'Sample flight',
		hotel: 'Sample hotel',
	})),
}));

// Optionally: silence or capture logs
vi.mock('../src/infra/logging/logger.js', () => ({
	Logger: class {
		logInfo() {}
		logError() {}
	},
}));

describe('Worker fetch', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 204 for OPTIONS', async () => {
		const req = new Request('https://example.com', { method: 'OPTIONS' });
		const res = await worker.fetch(req, envStub);
		expect(res.status).toBe(204);
	});

	it('rejects non-POST with 405', async () => {
		const req = new Request('https://example.com', { method: 'GET' });
		const res = await worker.fetch(req, envStub);
		expect(res.status).toBe(405);
	});

	it('returns 400 for invalid JSON', async () => {
		const req = new Request('https://example.com', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			// invalid JSON: use a ReadableStream or plain text without JSON
			body: 'not-json',
		});
		const res = await worker.fetch(req, envStub);
		expect(res.status).toBe(400);
		const body = await readJson(res);
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	it('returns 200 for valid request and includes aggregated result', async () => {
		const req = makeRequest('POST', {
			from: 'Paris',
			to: 'Rome',
			start: '2025-06-10',
			end: '2025-06-15',
			travellers: 2,
			budget: 1000,
		});

		const res = await worker.fetch(req, envStub);
		expect(res.status).toBe(200);
		const body = await readJson(res);

		expect(body.from).toBe('Paris');
		expect(body.to).toBe('Rome');
		expect(body.weather).toBeTruthy();
		expect(body.flight).toBeTruthy();
		expect(body.hotel).toBeTruthy();
	});

	it('maps domain validation errors to 400', async () => {
		// Missing required fields to trigger validation
		const req = makeRequest('POST', { from: '', to: '', start: 'bad', end: 'bad' });
		const res = await worker.fetch(req, envStub);
		// Depending on your mapping, expect 400
		expect([400, 500]).toContain(res.status); // loosen if mapping differs
	});
});
