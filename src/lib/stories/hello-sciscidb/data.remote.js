import { query } from '$app/server';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import * as v from 'valibot';

const API_BASE_URL = env.STORYWRANGLER_API_BASE || 'http://localhost:8000';

async function fetchMetrics({ group_by, start_year, end_year, field, metric_type, dataset, limit, exclude_nulls, top_n }) {
	const params = new URLSearchParams({ group_by });

	if (dataset) params.set('dataset', dataset);
	if (start_year != null) params.set('start_year', start_year.toString());
	if (end_year != null) params.set('end_year', end_year.toString());
	if (limit != null) params.set('limit', limit.toString());
	if (exclude_nulls != null) params.set('exclude_nulls', exclude_nulls.toString());
	if (top_n != null) params.set('top_n', top_n.toString());
	if (field) params.set('field', Array.isArray(field) ? field.join(',') : field);
	if (metric_type) params.set('metric_type', Array.isArray(metric_type) ? metric_type.join(',') : metric_type);

	const url = `${API_BASE_URL}/scisciDB/metrics?${params}`;
	console.log('[fetchMetrics] GET', url);
	const response = await fetch(url);
	if (!response.ok) {
		console.error('[fetchMetrics] failed', response.status, response.statusText);
		error(response.status, `API error: ${response.statusText}`);
	}
	const json = await response.json();
	console.log('[fetchMetrics] got', Array.isArray(json) ? `${json.length} rows` : json);
	return json;
}

// Field aggregation with multiple metrics (for FosBarChart)
export const getAllFieldsAgg = query(async () => {
	const data = await fetchMetrics({
		group_by: 'field,metric_type',
		start_year: 1900,
		end_year: 2025,
		metric_type: ['total', 'has_abstract', 'has_fulltext'],
		limit: 5000
	});

	const fieldTotals = {};
	data.forEach((row) => {
		if (row.metric_type === 'total') fieldTotals[row.field] = row.count;
	});

	return data.sort((a, b) => (fieldTotals[b.field] || 0) - (fieldTotals[a.field] || 0));
});

// STEM fields over time (for Streamgraph)
export const getFieldsStem = query(async () => {
	const stemFields = [
		'Computer Science', 'Medicine', 'Physics', 'Chemistry',
		'Biology', 'Mathematics', 'Materials Science', 'Engineering',
		'Environmental Science'
	];

	const data = await fetchMetrics({
		group_by: 'field,year,metric_type',
		start_year: 2000,
		end_year: 2024,
		field: stemFields,
		metric_type: ['total', 'has_abstract', 'has_fulltext'],
		limit: 5000
	});

	return data.map((row) => ({
		year: row.year,
		field: row.field,
		count: row.count,
		metric: row.metric_type
	}));
});

// Primary subfields/topics over time for a given field (for Streamgraph)
export const getSubfieldsByField = query(
	v.object({ field: v.string(), top_n: v.number(), metric_type: v.string(), dimension: v.string() }),
	async ({ field, top_n, metric_type, dimension }) => {
		const data = await fetchMetrics({
			group_by: `${dimension},year`,
			dataset: 'field-topic-metrics',
			start_year: 1960,
			end_year: 2024,
			field,
			metric_type,
			exclude_nulls: true,
			top_n,
			limit: 5000
		});

		return data.map((row) => ({
			year: row.year,
			field: row[dimension],
			count: row.count,
		}));
	}
);

// Social Science fields over time (for Streamgraph)
export const getFieldsSocSci = query(async () => {
	const socSciFields = [
		'Psychology', 'Sociology', 'Economics', 'Political Science',
		'Education', 'Business', 'Law', 'History', 'Philosophy',
		'Art', 'Linguistics', 'Geography'
	];

	const data = await fetchMetrics({
		group_by: 'field,year,metric_type',
		start_year: 2000,
		end_year: 2024,
		field: socSciFields,
		metric_type: ['total', 'has_abstract', 'has_fulltext'],
		limit: 5000
	});

	return data.map((row) => ({
		year: row.year,
		field: row.field,
		count: row.count,
		metric: row.metric_type
	}));
});
