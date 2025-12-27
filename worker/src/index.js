import { Config } from './infra/config/env';
import { Logger } from './infra/logging/logger';
import { OpenAIService } from './infra/ai/openaiService';
import { toolService } from './infra/ai/toolService';
import { planTrip } from './app/planTrip';
import { TripData } from './domain/types';
import { mapErrorToHttp } from './http/errorMapping';

const headers = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
	'Content-Type': 'application/json',
};

export default {
	async fetch(request, env) {
		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers });
		}

		if (request.method !== 'POST') {
			return new Response('Method Not Allowed', { status: 405, headers });
		}

		let json;
		try {
			json = await request.json();
		} catch {
			return new Response(JSON.stringify({ code: 'VALIDATION_ERROR', message: 'Invalid JSON body' }), { status: 400, headers });
		}

		const logger = new Logger();
		try {
			let tripData = TripData.create(json);

			const config = Config.fromEnv(env);
			const openai = new OpenAIService(config.OPENAI_API_KEY).get();
			const toolRunner = toolService(config);

			logger.logInfo?.('request.start', { trip: json });

			tripData = await planTrip({ openai, tripData, toolRunner, logger });

			logger.logInfo?.('request.success', { result: { weather: !!tripData.weather, flight: !!tripData.flight, hotel: !!tripData.hotel } });

			return new Response(JSON.stringify(tripData), { headers });
		} catch (error) {
			const { status, body } = mapErrorToHttp(error);
			return new Response(JSON.stringify(body), {
				status,
				headers,
			});
		}
	},
};
