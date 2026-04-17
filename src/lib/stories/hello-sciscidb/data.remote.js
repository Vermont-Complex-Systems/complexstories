import { prerender } from '$app/server';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const API_BASE_URL = env.API_BASE || 'http://localhost:3001';

async function fetchMetrics({ start_year, end_year, fields, metric_types, group_by = 'field' }) {
	const params = new URLSearchParams({
		start_year: start_year.toString(),
		end_year: end_year.toString(),
		group_by
	});

	if (fields?.length) fields.forEach((f) => params.append('fields', f));
	if (metric_types?.length) metric_types.forEach((m) => params.append('metric_types', m));

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
export const getAllFieldsAgg = prerender(async () => {
	const data = await fetchMetrics({
		start_year: 1900,
		end_year: 2025,
		metric_types: ['total', 'has_abstract', 'has_fulltext']
	});

	const fieldMetrics = {};
	data.forEach((row) => {
		if (!fieldMetrics[row.field]) fieldMetrics[row.field] = {};
		if (!fieldMetrics[row.field][row.metric_type]) fieldMetrics[row.field][row.metric_type] = 0;
		fieldMetrics[row.field][row.metric_type] += row.count;
	});

	const result = [];
	Object.entries(fieldMetrics).forEach(([field, metrics]) => {
		Object.entries(metrics).forEach(([metric_type, count]) => {
			result.push({ field, metric_type, count });
		});
	});

	const fieldTotals = {};
	result.forEach((row) => {
		if (row.metric_type === 'total') fieldTotals[row.field] = row.count;
	});

	return result.sort((a, b) => (fieldTotals[b.field] || 0) - (fieldTotals[a.field] || 0));
});

// STEM fields over time (for Streamgraph)
export const getFieldsStem = prerender(async () => {
	const stemFields = [
		'Computer Science', 'Medicine', 'Physics', 'Chemistry',
		'Biology', 'Mathematics', 'Materials Science', 'Engineering',
		'Environmental Science'
	];

	const data = await fetchMetrics({
		start_year: 2000,
		end_year: 2024,
		fields: stemFields,
		metric_types: ['total', 'has_abstract', 'has_fulltext']
	});

	return data.map((row) => ({
		year: row.year,
		field: row.field,
		count: row.count,
		metric: row.metric_type
	}));
});

// Social Science fields over time (for Streamgraph)
export const getFieldsSocSci = prerender(async () => {
	const socSciFields = [
		'Psychology', 'Sociology', 'Economics', 'Political Science',
		'Education', 'Business', 'Law', 'History', 'Philosophy',
		'Art', 'Linguistics', 'Geography'
	];

	const data = await fetchMetrics({
		start_year: 2000,
		end_year: 2024,
		fields: socSciFields,
		metric_types: ['total', 'has_abstract', 'has_fulltext']
	});

	return data.map((row) => ({
		year: row.year,
		field: row.field,
		count: row.count,
		metric: row.metric_type
	}));
});
