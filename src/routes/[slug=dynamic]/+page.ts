import { error } from '@sveltejs/kit';
import { formatMonth, parseTags } from '$lib/utils';
import storiesData from '$lib/data/stories.csv';

// Dynamic stories call live APIs — disable SSR to avoid hydration mismatches.
// Which slugs land here is controlled by src/params/dynamic.js (reads stories.csv).
export const ssr = false;

const storyModules = import.meta.glob('$lib/stories/*/components/Index.svelte');
const copyModules = import.meta.glob<{ default: Record<string, unknown> }>(
	'$lib/stories/*/data/copy.json',
	{ eager: true }
);

export async function load({ params }) {
	const { slug } = params;
	const path = `/src/lib/stories/${slug}/components/Index.svelte`;
	const loader = storyModules[path];

	if (!loader) error(404, `Story "${slug}" not found`);

	const mod = await loader();

	const raw = (storiesData as any[]).find((d) => d.slug === slug);
	if (!raw) error(404, `Story metadata for "${slug}" not found`);

	const story = { ...raw, month: formatMonth(raw.date), tags: parseTags(raw.tags, true) };
	const copyData = copyModules[`/src/lib/stories/${slug}/data/copy.json`]?.default ?? {};

	return {
		component: (mod as { default: import('svelte').Component }).default,
		slug,
		story,
		copyData
	};
}
