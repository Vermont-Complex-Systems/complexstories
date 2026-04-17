import storiesData from '$lib/data/stories.csv';

// Stories marked dynamic=true in the CSV need ssr=false (they call live APIs).
// This matcher drives routing: [slug=dynamic_story] handles CSR stories,
// [slug] handles everything else with SSR.
const dynamicSlugs = new Set(
	storiesData.filter((d) => d.dynamic === 'true').map((d) => d.slug)
);

/** @param {string} param */
export function match(param) {
	return dynamicSlugs.has(param);
}
