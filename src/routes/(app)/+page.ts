import { getStories } from '$lib/story.remote.js';

// Fetch in the load function, not via top-level await in a component —
// async components hydrate out of sync with SSR (hydration_mismatch).
export async function load() {
	return { stories: await getStories() };
}
