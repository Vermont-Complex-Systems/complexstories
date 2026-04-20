import { query } from '$app/server';
import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const API_BASE_URL = env.STORYWRANGLER_API_BASE || 'http://localhost:8000';

export const loadPaperData = query(
    v.object({
        authorName: v.string(),
        filterBigPapers: v.boolean()
     }),
    async ({authorName, filterBigPapers}) => {
    const response = await fetch(`${API_BASE_URL}/open-academic-analytics/papers/${authorName}?filter_big_papers=${filterBigPapers}`);
    if (!response.ok) error(404, 'Not found');
    const papers = await response.json();
    const processedPapers = papers.map(paper => ({
          ...paper,
          pub_date: new Date(paper.publication_date).toISOString().split('T')[0]
    }));
    return processedPapers;
  });

export const loadCoauthorData = query(
	v.object({
		authorName: v.string(),
		filterBigPapers: v.boolean()
	}),
	async ({ authorName, filterBigPapers }) => {
		const response = await fetch(
			`${API_BASE_URL}/open-academic-analytics/coauthors/${authorName}?filter_big_papers=${filterBigPapers}`
		);
		if (!response.ok) error(404, 'Not found');
		const coauthors = await response.json();
		return coauthors.map((coauthor) => ({
			...coauthor,
			pub_date: new Date(coauthor.publication_date).toISOString().split('T')[0]
		}));
	}
);

export const loadAvailableAuthors = query(async () => {
	const response = await fetch(`${API_BASE_URL}/open-academic-analytics/authors`);
	if (!response.ok) error(404, 'Not found');
	return await response.json();
});

export const loadTrainingData = query(
	v.object({
		authorName: v.string()
	}),
	async ({ authorName }) => {
		const response = await fetch(
			`${API_BASE_URL}/open-academic-analytics/training/${encodeURIComponent(authorName)}`
		);
		if (!response.ok) {
			if (response.status === 404) return [];
			error(response.status, 'Failed to load training data');
		}
		const data = await response.json();
		return data.training_data || [];
	}
);
