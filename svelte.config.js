import adapter from '@sveltejs/adapter-node'
import { readFileSync } from 'fs';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

// Example of how to dynamically prerender members in static web app.
// There might be a better way to do that at some point.
const membersCSV = readFileSync('src/lib/data/members.csv', 'utf-8');
const memberIds = membersCSV.split('\n').slice(1).filter(line => line.trim()).map(line => line.split(',')[0]);


const storiesCSV = readFileSync('src/lib/data/stories.csv', 'utf-8');
const storiesIds = storiesCSV.split('\n').slice(1).filter(line => line.trim()).map(line => line.split(','))
	.filter(cols => !cols[5] && cols[7] !== 'true') // skip external URLs and dynamic stories
	.map(cols => cols[0]);

const blogsCSV = readFileSync('src/lib/data/blog.csv', 'utf-8');
const blogSlugs = blogsCSV.split('\n').slice(1).filter(line => line.trim()).map(line => line.split(',')[0]);

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		prerender: {
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