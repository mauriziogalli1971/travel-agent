import { weatherAgent } from './agents/weatherAgent';
import { flightsAgent } from './agents/flightsAgent';
import { hotelsAgent } from './agents/hotelsAgent';

export async function planTrip({ openai, tripData, toolRunner, logger }) {
	// noinspection ES6MissingAwait
	const agentsPromises = [
		weatherAgent({ openai, tripData, toolRunner, logger }),
		flightsAgent({ openai, tripData, toolRunner, logger }),
		hotelsAgent({ openai, tripData, toolRunner, logger }),
	];

	const agentsResults = await Promise.allSettled(agentsPromises);

	// Map results safely
	const safeGet = (i) => (agentsResults[i]?.status === 'fulfilled' ? agentsResults[i].value : null);

	return {
		...tripData,
		weather: safeGet(0),
		flight: safeGet(1),
		hotel: safeGet(2),
	};
}
