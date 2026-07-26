import { error } from '@sveltejs/kit';
import { getStory } from '$lib/story.remote.js';

// Vite discovers all story entry points at build time.
// Each key is a path like "/src/lib/stories/{slug}/components/Index.svelte".
const storyModules = import.meta.glob('$lib/stories/*/components/Index.svelte');

// The load function resolves the component AND the story data.
// Fetching here (not via top-level `await` in +page.svelte) keeps the page
// component synchronous — async component hydration desyncs from SSR and
// triggers hydration_mismatch + a client re-render on every static story.
export async function load({ params }) {
	const path = `/src/lib/stories/${params.slug}/components/Index.svelte`;
	const loader = storyModules[path];

	if (!loader) error(404, `Story "${params.slug}" not found`);

	const [mod, { story, copyData }] = await Promise.all([loader(), getStory(params.slug)]);

	return {
		component: (mod as { default: import('svelte').Component }).default,
		slug: params.slug,
		story,
		copyData
	};
}
