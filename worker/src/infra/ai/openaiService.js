import { OpenAI } from 'openai';

export class OpenAIService {
	constructor(apiKey, config) {
		this.openai = new OpenAI({
			apiKey,
			baseURL: 'https://gateway.ai.cloudflare.com/v1/4892e0000e9e2f5967571b3c44400136/travel-agent-gateway/openai',
		});
		this.config = config || {
			model: 'gpt-5',
			// temperature: 0.8,
		};
	}

	get() {
		return {
			client: this.openai,
			config: this.config,
		};
	}
}
