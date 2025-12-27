const DEFAULT_CONFIG = {
	apiKey: '',
	apiUrl: '',
	apiPath: '',
	apiMethod: 'GET',
	timeoutMs: 20000,
};
const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
export class FetchClient {
	/**
	 * @param {Partial<typeof DEFAULT_CONFIG> & { body?: any, headers?: Record<string,string> }} config
	 */
	constructor(config = {}) {
		const cfg = { ...DEFAULT_CONFIG, ...(config || {}) };

		if (!cfg.apiUrl) throw new Error('apiUrl is required');
		const path = cfg.apiPath || '';
		if (!URL.canParse(path, cfg.apiUrl)) throw new Error('Invalid API URL');

		const url = new URL(path, cfg.apiUrl);

		const method = (cfg.apiMethod || 'GET').toUpperCase();
		const init = {
			method,
			headers: new Headers(cfg.headers || {}),
		};

		if (cfg.apiKey && !init.headers.has('authorization')) {
			init.headers.set('authorization', `Bearer ${cfg.apiKey}`);
		}

		if (METHODS_WITH_BODY.has(method) && cfg.body != null) {
			if (typeof cfg.body === 'string') {
				if (!init.headers.has('content-type')) {
					init.headers.set('content-type', 'text/plain;charset=utf-8');
				}
				init.body = cfg.body;
			} else {
				if (!init.headers.has('content-type')) {
					init.headers.set('content-type', 'application/json');
				}
				init.body = JSON.stringify(cfg.body);
			}
		}

		this.request = new Request(url.toString(), init);
	}

	async handle(timeoutMs = DEFAULT_CONFIG.timeoutMs) {
		const controller = new AbortController();
		const id = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);

		try {
			const response = await fetch(this.request, { signal: controller.signal });

			const contentType = response.headers.get('content-type') || '';
			if (!response.ok) {
				let details = null;
				if (contentType.includes('application/json')) {
					try {
						details = await response.json();
					} catch {
						// ignore errors parsing JSON
					}
				}
				const err = new Error(`Upstream request failed: ${response.status} ${response.statusText}`);
				err.status = response.status;
				err.details = details;
				throw err;
			}

			if (contentType.includes('application/json')) {
				return await response.json();
			}
			return await response.text();
		} catch (e) {
			// Normalize abort/timeout error
			if (e.name === 'AbortError' || e.message === 'timeout') {
				const err = new Error(`Request timed out after ${timeoutMs}ms`);
				err.code = 'ETIMEOUT';
				throw err;
			}
			throw e;
		} finally {
			clearTimeout(id);
		}
	}
}
