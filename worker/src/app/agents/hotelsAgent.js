import { runToolLoop } from './agentLoop';

export async function hotelsAgent({ openai, tripData, toolRunner, logger }) {
	const { client, config } = openai;
	const { to, travellers, start, end } = tripData;
	const { tools } = toolRunner;

	try {
		// 1) Setup conversation
		const system = {
			role: 'system',
			content: `Plan with multiple steps.
			Strictly adhere to the following instructions:
		  - Don’t repeat the same function call with identical arguments.
		  - call getHotelsData to get the hotels for the user's destination, then produce the final answer.`,
		};
		const user = {
			role: 'user',
			content: `What is the best hotel in ${to} for ${travellers} people with check-in on ${start} and check-out on ${end}?`,
		};
		const messages = [system, user];

		// 2) Execute tool calls and send results back using toolCalls
		await runToolLoop({ agentName: 'hotelsAgent', client, config, messages, tools, logger, toolRunner });

		// 3) Final concise answer
		logger.logInfo({ msg: 'hotelsAgent - response' });
		const final = await client.chat.completions.create({
			...config,
			messages: [
				...messages,
				{
					role: 'system',
					content: `Respond only with a one-sentence containing the best hotel option derived from the provided tool observations.`,
				},
			],
		});

		return final.choices[0]?.message?.content ?? 'Unable to determine the hotels right now.';
	} catch (e) {
		logger.logError({ msg: 'hotelsAgent', meta: { e } });
		return 'Unable to determine the hotels right now.';
	}
}
