import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const API_BASE_URL = env.STORYWRANGLER_API_BASE || 'http://localhost:8000';

/**
 * Fetch JSON from the Storywrangler API, translating failures into
 * human-readable errors for the stories' error UI.
 *
 * @param {string} path - API path starting with '/'
 * @param {string} what - human description of the data, e.g. "the coauthor network"
 */
export async function fetchStorywrangler(path, what) {
	let response;
	try {
		response = await fetch(`${API_BASE_URL}${path}`);
	} catch {
		error(503, 'The data server is unreachable right now.');
	}
	if (!response.ok) {
		const detail = await response
			.json()
			.then((body) => body?.detail)
			.catch(() => null);
		if (detail?.code === 'DATA_NOT_AVAILABLE') {
			error(503, `The "${detail.dataset}" dataset is unavailable right now.`);
		}
		const message = typeof detail === 'string' ? detail : detail?.message;
		error(
			response.status,
			message
				? `Couldn't load ${what}: ${message}`
				: `Couldn't load ${what} (HTTP ${response.status}).`
		);
	}
	return response.json();
}
