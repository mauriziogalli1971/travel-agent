/**
 * @typedef {Object} Config
 */
export class Config {
	/** @type {string} */
	OPENAI_API_KEY;
	/** @type {string} */
	SUPABASE_URL;
	/** @type {string} */
	SUPABASE_API_KEY;
	/** @type {string} */
	OPENWEATHER_API_KEY;
	/** @type {string} */
	SERPAPI_API_KEY;

	/**
	 * Creates a new Config instance.
	 * @param env {Object} - The environment variables in Cloudflare Workers.
	 */
	constructor(env) {
		const { OPENAI_API_KEY, SUPABASE_URL, SUPABASE_API_KEY, OPENWEATHER_API_KEY, SERPAPI_API_KEY } = env;

		this.OPENAI_API_KEY = OPENAI_API_KEY;
		this.SUPABASE_URL = SUPABASE_URL;
		this.SUPABASE_API_KEY = SUPABASE_API_KEY;
		this.OPENWEATHER_API_KEY = OPENWEATHER_API_KEY;
		this.SERPAPI_API_KEY = SERPAPI_API_KEY;
	}

	static fromEnv(env) {
		const { OPENAI_API_KEY, SUPABASE_URL, SUPABASE_API_KEY, OPENWEATHER_API_KEY, SERPAPI_API_KEY } = env;
		if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required');
		if (!SUPABASE_URL) throw new Error('SUPABASE_URL is required');
		if (!SUPABASE_API_KEY) throw new Error('SUPABASE_API_KEY is required');

		if (!OPENWEATHER_API_KEY) throw new Error('OPENWEATHER_API_KEY is required');
		if (!SERPAPI_API_KEY) throw new Error('SERPAPI_API_KEY is required');

		return new Config(env);
	}
}
