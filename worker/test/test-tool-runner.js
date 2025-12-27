// JavaScript
import { describe, expect, it, vi } from 'vitest';
import { ToolRunner } from '../src/infra/ai/toolRunner.js';

describe('ToolRunner', () => {
	it('routes to known tools and appends tool result', async () => {
		const tools = [{ type: 'function', function: { name: 'getData', parameters: {} } }];
		const toolsMap = {
			getData: vi.fn().mockResolvedValue({ hello: 'world' }),
		};
		const runner = new ToolRunner({ tools, toolsMap });

		const messages = [];
		const logger = { logError: vi.fn() };
		const toolCalls = [{ id: 'a', type: 'function', function: { name: 'getData', arguments: JSON.stringify({ x: 1 }) } }];

		await runner.handleToolCalls({ toolCalls, messages, logger });

		expect(toolsMap.getData).toHaveBeenCalledWith({ x: 1 });
		expect(messages.find((m) => m.role === 'tool' && m.tool_call_id === 'a')).toBeTruthy();
	});

	it('handles unknown tool gracefully', async () => {
		const tools = [{ type: 'function', function: { name: 'known', parameters: {} } }];
		const toolsMap = { known: vi.fn().mockResolvedValue({}) };
		const runner = new ToolRunner({ tools, toolsMap });

		const messages = [];
		const toolCalls = [{ id: 'b', type: 'function', function: { name: 'unknown', arguments: '{}' } }];

		await runner.handleToolCalls({ toolCalls, messages, logger: {} });

		const toolMsg = messages.find((m) => m.role === 'tool' && m.tool_call_id === 'b');
		expect(JSON.parse(toolMsg.content).error).toMatch(/Unknown tool/);
	});

	it('catches tool errors and appends failure messages', async () => {
		const tools = [{ type: 'function', function: { name: 'boom', parameters: {} } }];
		const toolsMap = {
			boom: vi.fn().mockRejectedValue(new Error('kaboom')),
		};
		const runner = new ToolRunner({ tools, toolsMap });

		const messages = [];
		const logger = { logError: vi.fn() };
		const toolCalls = [{ id: 'c', type: 'function', function: { name: 'boom', arguments: '{}' } }];

		await runner.handleToolCalls({ toolCalls, messages, logger });

		const toolMsg = messages.find((m) => m.role === 'tool' && m.tool_call_id === 'c');
		expect(JSON.parse(toolMsg.content).error).toMatch(/kaboom|Tool failed/);
		// assistant fallback message appended
		const assistantMsg = messages.find((m) => m.role === 'assistant' && /Failed to get boom result/.test(m.content));
		expect(assistantMsg).toBeTruthy();
	});
});
