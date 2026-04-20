import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import dsv from "@rollup/plugin-dsv";

export default defineConfig({
	ssr: {
		noExternal: ['@tanstack/svelte-query']
	},
	server: {
		fs: {
			allow: [
				// Allow Vite to serve files from the vcsi-starter monorepo
				// (needed for linked scrolly-kit's KaTeX fonts)
				'../vcsi-starter'
			]
		}
	},
	plugins: [
		enhancedImages(),
		sveltekit(),
		dsv({
			processRow: (row) => {
				Object.keys(row).forEach((key) => {
					const value = row[key];
					// @ts-ignore - intentionally converting numeric strings to numbers
					row[key] = isNaN(+value) ? value : +value;
				});
			}
		})
	]
});
