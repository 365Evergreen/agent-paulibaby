// node_modules/@cloudflare/think/dist/hook-proxy-DY2sBNa0.js
/**
* Best-effort JSON-safe normalization. Strips functions, AbortSignals,
* symbols, and replaces `Error` instances with `{ name, message, stack }`.
* Falls back to `String(value)` for anything that won't round-trip.
*/
function jsonSafe(value, depth = 0) {
	if (depth > 6) return void 0;
	if (value === null || value === void 0) return value;
	const t = typeof value;
	if (t === "string" || t === "number" || t === "boolean") return value;
	if (t === "bigint") return String(value);
	if (t === "function" || t === "symbol") return void 0;
	if (value instanceof Error) return {
		name: value.name,
		message: value.message,
		stack: value.stack
	};
	if (Array.isArray(value)) return value.map((v) => jsonSafe(v, depth + 1));
	if (t === "object") {
		const out = {};
		for (const [k, v] of Object.entries(value)) {
			if (v instanceof AbortSignal) continue;
			const safe = jsonSafe(v, depth + 1);
			if (safe !== void 0) out[k] = safe;
		}
		return out;
	}
	try {
		return String(value);
	} catch {
		return;
	}
}
/**
* Create a serializable snapshot from a TurnContext.
*
* Pass `model` when `beforeTurn` already overrode it: `ctx.model` lazily
* resolves the default model, which may need an AI binding the turn never uses.
*/
function createTurnContextSnapshot(ctx, model = ctx.model) {
	return {
		system: ctx.system,
		toolNames: Object.keys(ctx.tools),
		messageCount: ctx.messages.length,
		continuation: ctx.continuation,
		body: ctx.body,
		modelId: typeof model === "string" ? model : model.modelId ?? "unknown",
		...ctx.requestId !== void 0 && { requestId: ctx.requestId },
		...ctx.trigger !== void 0 && { trigger: ctx.trigger }
	};
}
/**
* Parse a hook result from the extension Worker's JSON response.
* Returns a TurnConfig or null if the extension skipped/errored.
*/
function parseHookResult(json) {
	try {
		const parsed = JSON.parse(json);
		if (parsed.skipped) return { skipped: true };
		if (parsed.error) return { error: parsed.error };
		return { config: parsed.result ?? {} };
	} catch {
		return { error: "Failed to parse hook result" };
	}
}
function createToolCallStartSnapshot(event) {
	return {
		toolName: event.toolCall.toolName,
		toolCallId: event.toolCall.toolCallId,
		input: jsonSafe(event.toolCall.input),
		stepNumber: event.stepNumber,
		...event.toolCall.dynamic !== void 0 ? { dynamic: event.toolCall.dynamic } : {}
	};
}
function createToolCallFinishSnapshot(event) {
	return {
		toolName: event.toolCall.toolName,
		toolCallId: event.toolCall.toolCallId,
		input: jsonSafe(event.toolCall.input),
		stepNumber: event.stepNumber,
		durationMs: event.durationMs,
		success: event.success,
		...event.success ? { output: jsonSafe(event.output) } : { error: jsonSafe(event.error) },
		...event.toolCall.dynamic !== void 0 ? { dynamic: event.toolCall.dynamic } : {}
	};
}
function createStepFinishSnapshot(event) {
	return {
		stepNumber: event.stepNumber,
		finishReason: event.finishReason,
		text: event.text,
		reasoningText: event.reasoningText,
		toolCallCount: event.toolCalls.length,
		toolResultCount: event.toolResults.length,
		usage: event.usage ? {
			inputTokens: event.usage.inputTokens,
			outputTokens: event.usage.outputTokens,
			totalTokens: event.usage.totalTokens,
			reasoningTokens: event.usage.outputTokenDetails?.reasoningTokens ?? event.usage.reasoningTokens,
			cachedInputTokens: event.usage.inputTokenDetails?.cacheReadTokens ?? event.usage.cachedInputTokens
		} : void 0,
		providerMetadata: event.providerMetadata
	};
}
function createChunkSnapshot(event) {
	const c = event.chunk;
	const snapshot = { type: c.type };
	if (typeof c.text === "string") snapshot.text = c.text;
	if (typeof c.toolName === "string") snapshot.toolName = c.toolName;
	if (typeof c.toolCallId === "string") snapshot.toolCallId = c.toolCallId;
	return snapshot;
}
export { createChunkSnapshot, createStepFinishSnapshot, createToolCallFinishSnapshot, createToolCallStartSnapshot, createTurnContextSnapshot, parseHookResult };

//# sourceMappingURL=hook-proxy-DY2sBNa0-VezB9thd.js.map