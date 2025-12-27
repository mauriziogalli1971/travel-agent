// JavaScript
import { describe, expect, it, vi } from 'vitest';
import { runToolLoop } from '../src/app/agents/agentLoop.js';

describe('runToolLoop', () => {
	it('executes tool calls and appends tool results', async () => {
		const messages = [
			{ role: 'system', content: 'x' },
			{ role: 'user', content: 'y' },
		];
		const toolCalls = [
			{
				id: 'call-1',
				type: 'function',
				function: { name: 'getData', arguments: JSON.stringify({ q: 'hello' }) },
			},
		];

		const client = {
			chat: {
				completions: {
					create: vi
						.fn()
						// First iteration: assistant asks to call tool
						.mockResolvedValueOnce({ choices: [{ message: { role: 'assistant', content: null, tool_calls: toolCalls } }] })
						// Second iteration: assistant returns final
						.mockResolvedValueOnce({ choices: [{ message: { role: 'assistant', content: 'done' } }] }),
				},
			},
		};

		const tools = [{ type: 'function', function: { name: 'getData', parameters: {} } }];
		const toolRunner = {
			handleToolCalls: vi.fn().mockImplementation(async ({ messages }) => {
				messages.push({ role: 'tool', tool_call_id: 'call-1', content: JSON.stringify({ ok: true }) });
			}),
		};
		const logger = { logInfo: vi.fn(), logError: vi.fn() };

		await runToolLoop({ agentName: 'testAgent', client, config: {}, messages, tools, logger, toolRunner });

		// Created at least twice (tool step + final)
		expect(client.chat.completions.create).toHaveBeenCalledTimes(2);
		// Tool was executed
		expect(toolRunner.handleToolCalls).toHaveBeenCalledTimes(1);
		// Tool message appended
		const hasToolMsg = messages.some((m) => m.role === 'tool' && m.tool_call_id === 'call-1');
		expect(hasToolMsg).toBe(true);
	});
});
