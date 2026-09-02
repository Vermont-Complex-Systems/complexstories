import { prerender } from '$app/server';
import { fetchStorywrangler } from '$lib/server/storywrangler.js';

export const loadDoddsPaperData = prerender(async () => {
	const papers = await fetchStorywrangler(
		'/open-academic-analytics/papers/Peter%20Sheridan%20Dodds?filter_big_papers=false',
		"Peter Dodds' publication history"
	);
	return papers.map((paper) => ({
		...paper,
		pub_date: new Date(paper.publication_date).toISOString().split('T')[0]
	}));
}, { dynamic: true });

export const loadDoddsCoauthorData = prerender(async () => {
	const coauthors = await fetchStorywrangler(
		'/open-academic-analytics/coauthors/Peter%20Sheridan%20Dodds?filter_big_papers=false',
		"Peter Dodds' coauthor network"
	);
	return coauthors.map((coauthor) => ({
		...coauthor,
		pub_date: new Date(coauthor.publication_date).toISOString().split('T')[0]
	}));
}, { dynamic: true });

export const loadUvmProfsData = prerender(async () => {
	return await fetchStorywrangler(
		'/open-academic-analytics/academic-research-groups?payroll_year=2023',
		'the UVM faculty roster'
	);
}, { dynamic: true });

export const loadEmbeddingsData = prerender(async () => {
	return await fetchStorywrangler('/open-academic-analytics/embeddings', 'the paper embeddings');
}, { dynamic: true });
