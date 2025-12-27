export async function runToolLoop({ agentName, client, config, messages, tools, logger, toolRunner }) {
	const MAX_ITERATIONS = 10;
	for (let i = 0; i < MAX_ITERATIONS; i++) {
		const response = await client.chat.completions.create({
			...config,
			messages,
			tools,
		});

		const assistantMsg = response.choices[0]?.message;
		if (!assistantMsg) break;

		logger.logInfo({ msg: `${agentName} - iteration ${i}` });

		messages.push(assistantMsg);

		const toolCalls = assistantMsg?.tool_calls;
		if (!toolCalls) break;

		const beforeLen = messages.length;
		await toolRunner.handleToolCalls({ toolCalls, messages, logger });
		const noChange = messages.length === beforeLen;
		if (noChange) break;
	}
}
