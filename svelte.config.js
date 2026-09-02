import adapter from '@sveltejs/adapter-node'
import { readFileSync } from 'fs';
import { csvParse } from 'd3-dsv';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

// Example of how to dynamically prerender members in static web app.
// There might be a better way to do that at some point.
// csvParse (not a naive split on ',') because quoted fields can contain commas,
// which would shift the columns used in the filters below.
const memberIds = csvParse(readFileSync('src/lib/data/members.csv', 'utf-8')).map(d => d.id);

const storiesIds = csvParse(readFileSync('src/lib/data/stories.csv', 'utf-8'))
	.filter(d => !d.externalUrl && d.dynamic !== 'true') // skip external URLs and dynamic stories
	.map(d => d.slug);

const blogSlugs = csvParse(readFileSync('src/lib/data/blog.csv', 'utf-8')).map(d => d.slug);

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		prerender: {
			handleHttpError({ path, message }) {
				// Remote functions fetch story data from external backends (e.g. the
				// Storywrangler API) at build time. A downed backend shouldn't kill the
				// whole site build — those functions are marked dynamic:true, so the
				// node server retries them at runtime once the backend is back.
				if (path.startsWith('/_app/remote/')) {
					console.warn(`[prerender] skipped remote function (backend down?): ${message}`);
					return;
				}
				throw new Error(message);
			},
			entries: [
				'*',
				...memberIds.map(id => `/about/${id}`),
				...storiesIds.map(id => `/${id}`),
				...blogSlugs.map(id => `/blog/${id}`)
			]
		},
		adapter: adapter(),
		alias: {
			'$stories': 'src/lib/stories'
		},
		experimental: {
			remoteFunctions: true,
		},
	},
	compilerOptions: {
		experimental: {
			async: true,
		},
	},
	vitePlugin: {
		inspector: true,
	},
}

export default config