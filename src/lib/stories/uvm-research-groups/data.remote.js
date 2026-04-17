import { prerender } from '$app/server';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const API_BASE_URL = env.API_BASE || 'http://localhost:3001';

export const loadDoddsPaperData = prerender(async () => {
	const response = await fetch(
		`${API_BASE_URL}/open-academic-analytics/papers/Peter%20Sheridan%20Dodds?filter_big_papers=false`
	);
	if (!response.ok) error(404, 'Not found');
	const papers = await response.json();
	return papers.map((paper) => ({
		...paper,
		pub_date: new Date(paper.publication_date).toISOString().split('T')[0]
	}));
});

export const loadDoddsCoauthorData = prerender(async () => {
	const response = await fetch(
		`${API_BASE_URL}/open-academic-analytics/coauthors/Peter%20Sheridan%20Dodds?filter_big_papers=false`
	);
	if (!response.ok) error(404, 'Not found');
	const coauthors = await response.json();
	return coauthors.map((coauthor) => ({
		...coauthor,
		pub_date: new Date(coauthor.publication_date).toISOString().split('T')[0]
	}));
});

export const loadUvmProfsData = prerender(async () => {
	const response = await fetch(
		`${API_BASE_URL}/datasets/academic-research-groups?skip=0&payroll_year=2023&format=json`
	);
	if (!response.ok) error(404, 'Not found');
	return await response.json();
});

export const loadEmbeddingsData = prerender(async () => {
	const response = await fetch(`${API_BASE_URL}/open-academic-analytics/embeddings`);
	if (!response.ok) error(404, 'Not found');
	return await response.json();
});
