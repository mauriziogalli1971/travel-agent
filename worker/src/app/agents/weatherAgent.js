import { runToolLoop } from './agentLoop';

export async function weatherAgent({ openai, tripData, toolRunner, logger }) {
	const { client, config } = openai;
	const { to, start, end } = tripData;
	const { tools } = toolRunner;

	try {
		// 1) Setup conversation
		const system = {
			role: 'system',
			content: `Plan with multiple steps.
			Strictly adhere to the following instructions:
		  - Don’t repeat the same function call with identical arguments.
		  - Use the tool_calls feature to call getCoordinates once for ${to} without adding any additional information to ${to} like city, state, country, etc.
		  - After obtaining coordinates as a result of the call getCoordinates, call getWeatherData once for those coordinates, then produce the final answer.`,
		};
		const user = {
			role: 'user',
			content: `What is the weather in ${to} between ${start} and ${end}?`,
		};
		const messages = [system, user];

		// 2) Execute tool calls and send results back using toolCalls
		await runToolLoop({ agentName: 'weatherAgent', client, config, messages, tools, logger, toolRunner });

		// 3) Final concise answer
		logger.logInfo({ msg: 'weatherAgent - response' });
		const final = await client.chat.completions.create({
			...config,
			messages: [
				...messages,
				{
					role: 'system',
					content: `Respond only with a one-sentence weather forecast derived from the provided tool observations.
						Include min and max Celsius temperatures, no dates.`,
				},
			],
		});

		return final.choices[0]?.message?.content ?? 'Unable to determine the weather right now.';
	} catch (e) {
		logger.logError({ msg: 'weatherAgent', meta: { e } });
		return 'Unable to determine the weather right now.';
	}
}
