export class ToolRunner {
	constructor({ tools, toolsMap }) {
		this.tools = tools;
		this.toolsMap = toolsMap;
	}

	async handleToolCalls({ toolCalls, messages, logger }) {
		for (const call of toolCalls) {
			if (call.type !== 'function' || !call.function) continue;

			const name = call.function.name;
			const callId = call.id;
			const args = parseParams(call.function.arguments);

			try {
				if (this.tools.find((t) => t.function.name === name)) {
					const result = await this.toolsMap[name](args);
					messages.push({
						role: 'tool',
						tool_call_id: callId,
						content: JSON.stringify(result ?? {}),
					});
				} else {
					messages.push({
						role: 'tool',
						tool_call_id: callId,
						content: JSON.stringify({ error: `Unknown tool: ${name}` }),
					});
					messages.push({
						role: 'assistant',
						content: `Got ${call.function.name} result.`,
					});
				}
			} catch (err) {
				logger?.logError?.({ msg: `Error executing tool: ${name}`, meta: { err: err?.message } });
				messages.push({
					role: 'tool',
					tool_call_id: callId,
					content: JSON.stringify({ error: err?.message || 'Tool failed' }),
				});
				messages.push({
					role: 'assistant',
					content: `Failed to get ${call.function.name} result.`,
				});
			}
		}
	}
}

function parseParams(params) {
	if (typeof params !== 'string') return params;
	const trimmed = params.trim();
	try {
		return JSON.parse(trimmed);
	} catch {
		return trimmed.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
	}
}
