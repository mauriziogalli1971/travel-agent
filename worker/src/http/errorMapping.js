export function mapErrorToHttp(error) {
	const code = error?.code;
	switch (code) {
		case 'VALIDATION_ERROR':
			return { status: 400, body: { code, message: error.message, details: error.details } };
		case 'NOT_FOUND':
			return { status: 404, body: { code, message: error.message } };
		case 'TIMEOUT_ERROR':
			return { status: 504, body: { code, message: error.message } };
		case 'REMOTE_API_ERROR':
			return { status: 502, body: { code, message: error.message } };
		case 'DOMAIN_ERROR':
		default:
			return { status: 500, body: { code: code ?? 'INTERNAL_ERROR', message: error.message ?? 'Internal Server Error' } };
	}
}
