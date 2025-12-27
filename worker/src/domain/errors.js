export class DomainError extends Error {
	constructor(message, code = 'DOMAIN_ERROR', details = undefined) {
		super(message);
		this.name = this.constructor.name;
		this.code = code;
		this.details = details;
	}
}

export class ValidationError extends DomainError {
	constructor(message = 'Validation failed', details = undefined) {
		super(message, 'VALIDATION_ERROR', details);
	}
}

export class NotFoundError extends DomainError {
	constructor(message = 'Not found', details = undefined) {
		super(message, 'NOT_FOUND', details);
	}
}

export class RemoteApiError extends DomainError {
	constructor(message = 'Remote API error', details = undefined) {
		super(message, 'REMOTE_API_ERROR', details);
	}
}

export class TimeoutError extends DomainError {
	constructor(message = 'Timeout expired', details = undefined) {
		super(message, 'TIMEOUT_ERROR', details);
	}
}
