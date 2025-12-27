const LOG_LEVEL = Object.freeze({
	DEBUG: 'debug',
	INFO: 'info',
	WARN: 'warn',
	ERROR: 'error',
});

export class Logger {
	constructor() {}

	// Private field: core log function
	#log({ level, step, msg, meta, now = new Date() }) {
		const entry = {
			level,
			step,
			msg,
			...(meta ?? {}),
			ts: now.toISOString(),
		};
		console.log(JSON.stringify(entry));
	}

	logInfo(step, msg, meta) {
		this.#log({ level: LOG_LEVEL.INFO, step, msg, meta });
	}

	logDebug(step, msg, meta) {
		this.#log({ level: LOG_LEVEL.DEBUG, step, msg, meta });
	}

	logWarn(step, msg, meta) {
		this.#log({ level: LOG_LEVEL.WARN, step, msg, meta });
	}

	logError(step, msg, meta) {
		this.#log({ level: LOG_LEVEL.ERROR, step, msg, meta });
	}
}
