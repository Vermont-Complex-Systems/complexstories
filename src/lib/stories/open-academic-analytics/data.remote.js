import { query } from '$app/server';
import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { API_BASE_URL, fetchStorywrangler } from '$lib/server/storywrangler.js';

export const loadPaperData = query(
    v.object({
        authorName: v.string(),
        filterBigPapers: v.boolean()
     }),
    async ({authorName, filterBigPapers}) => {
    const papers = await fetchStorywrangler(
        `/open-academic-analytics/papers/${authorName}?filter_big_papers=${filterBigPapers}`,
        `the publication history for ${authorName}`
    );
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
		const coauthors = await fetchStorywrangler(
			`/open-academic-analytics/coauthors/${authorName}?filter_big_papers=${filterBigPapers}`,
			`the coauthor network for ${authorName}`
		);
		return coauthors.map((coauthor) => ({
			...coauthor,
			pub_date: new Date(coauthor.publication_date).toISOString().split('T')[0]
		}));
	}
);

export const loadAvailableAuthors = query(async () => {
	return await fetchStorywrangler('/open-academic-analytics/authors', 'the list of authors');
});

export const loadTrainingData = query(
	v.object({
		authorName: v.string()
	}),
	async ({ authorName }) => {
		// Not using fetchStorywrangler here: a 404 (author or dataset missing)
		// intentionally degrades to an empty chart instead of an error.
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
