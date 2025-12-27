import { runToolLoop } from './agentLoop';

export async function flightsAgent({ openai, tripData, toolRunner, logger }) {
	const { client, config } = openai;
	const { from, to, start, end } = tripData;
	const { tools } = toolRunner;

	try {
		// 1) Setup conversation
		const system = {
			role: 'system',
			content: `Plan with multiple steps.
			Strictly adhere to the following instructions:
		  - Don’t repeat the same function call with identical arguments.
		  - Use the tool_calls feature to call getCoordinates once for ${from} without adding any additional information to ${from} like city, state, country, etc.
		  - Use the tool_calls feature to call getCoordinates once for ${to} without adding any additional information to ${to} like city, state, country, etc.
		  - Use the tool_calls feature to call getNearbyAirports to find what are the nearest airports to ${from} and to ${to} based on their coordinates.
		  - After obtaining the nearest airports, call getFlightsData once for those airports, then produce the final answer.`,
		};
		const user = {
			role: 'user',
			content: `What are the flights (departure on ${start}) and return (${end}) from the airports nearest to ${from} to the airports nearest to ${to}?`,
		};
		const messages = [system, user];

		// 2) Execute tool calls and send results back using toolCalls
		await runToolLoop({ agentName: 'flightsAgent', client, config, messages, tools, logger, toolRunner });

		// 3) Final concise answer
		logger.logInfo({ msg: 'flightsAgent - response' });
		const final = await client.chat.completions.create({
			...config,
			messages: [
				...messages,
				{
					role: 'system',
					content: `Respond only with a one-sentence containing the best flight option derived from the provided tool observations.`,
				},
			],
		});

		return final.choices[0]?.message?.content ?? 'Unable to determine the flight right now.';
	} catch (e) {
		logger.logError({ msg: 'flightsAgent', meta: { e } });
		return 'Unable to determine the flight right now.';
	}
}
