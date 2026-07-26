import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { query } from '$app/server';
import { env } from '$env/dynamic/private';
import { COUNTRIES, LEXICON, PLATFORMS, PLATFORM_KEYS, STOP_LENS, WORDSHIFT_LIMIT } from './constants';
import type { WordShiftResponse } from './types';

// The Storywrangler API base. Defaults to the hosted UVM instance; override
// with the STORYWRANGLER_URL env var (e.g. http://localhost:3003 locally).
const API_URL = env.STORYWRANGLER_URL ?? 'https://api.storywrangler.uvm.edu';

const isoDate = v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD'));

/** One comparison system: an optional country (entity) over a date span. */
const system = v.object({
	country: v.optional(v.string()),
	start: isoDate,
	end: isoDate
});

const argsSchema = v.object({
	platform: v.picklist(PLATFORM_KEYS),
	system1: system,
	system2: system
});

/**
 * Weighted-average sentiment word shift between two systems on one platform.
 * The `/storywrangler/wordshift` endpoint compares two systems *within a single
 * dataset*, so the platform is chosen once and both systems are read from it.
 * Each system is a `{ start, end }` span sent as the `dates` string (a single
 * day when start === end, else "start,end"). Per-dataset quirks (size-param name,
 * language filter, granularity rollup, entity/country axis) come from the
 * PLATFORMS config. System 1 is the baseline.
 */
export const getWordShift = query(argsSchema, async (args): Promise<WordShiftResponse> => {
	const p = PLATFORMS[args.platform];

	// Country only applies to entity platforms; validate it against the catalog.
	if (p.hasEntity) {
		for (const c of [args.system1.country, args.system2.country]) {
			if (c && !(COUNTRIES as readonly string[]).includes(c)) {
				error(400, `Unknown country: ${c}`);
			}
		}
	}

	const params = new URLSearchParams({
		domain: p.domain,
		dataset: p.dataset,
		lexicon: LEXICON,
		stop_lens: STOP_LENS, // drop neutral words (labMT score in [4,6]) before shifting
		wordshift_limit: String(WORDSHIFT_LIMIT)
	});
	params.set(p.sizeParam, '1'); // labMT is single-word → pin size to 1
	if (p.lang) params.set('lang', p.lang);
	if (p.apiGranularity) params.set('granularity', p.apiGranularity);

	// A single day (start === end) or a "start,end" range; the endpoint aggregates.
	const toDates = (s: { start: string; end: string }) =>
		s.start === s.end ? s.start : `${s.start},${s.end}`;
	params.set('dates', toDates(args.system1));
	params.set('dates2', toDates(args.system2));

	// Entity axis (wikipedia only); the endpoint reuses system 1's other filters
	// for system 2, so lang/size are set once above.
	if (p.hasEntity) {
		if (args.system1.country) params.set('entity', args.system1.country);
		if (args.system2.country) params.set('entity2', args.system2.country);
	}

	const url = `${API_URL}/storywrangler/wordshift?${params}`;

	let res: Response;
	try {
		res = await fetch(url);
	} catch {
		error(503, `Could not reach the Storywrangler API at ${API_URL}. Is it reachable?`);
	}

	if (!res.ok) {
		const detail = await res.json().catch(() => null);
		const message =
			(detail && (detail.detail?.message ?? detail.detail ?? detail.message)) ?? res.statusText;
		if (res.status === 404) error(404, `No data for that platform/date: ${message}`);
		if (res.status === 400) error(400, `Invalid request: ${message}`);
		if (res.status === 503) error(503, `The wordshift instrument is unavailable: ${message}`);
		error(res.status, `Wordshift request failed: ${message}`);
	}

	const raw = await res.json();
	return normalize(raw);
});

/** The server rewrites non-finite numbers; coerce them back to real numbers. */
function num(value: unknown): number {
	if (typeof value === 'number') return value;
	if (value === 'Infinity') return Infinity;
	if (value === '-Infinity') return -Infinity;
	if (value === null || value === undefined) return 0;
	const n = Number(value);
	return Number.isNaN(n) ? 0 : n;
}

function normalize(raw: any): WordShiftResponse {
	return {
		...raw,
		s_avg_1: num(raw.s_avg_1),
		s_avg_2: num(raw.s_avg_2),
		reference_value: num(raw.reference_value),
		normalization: raw.normalization, // a mode label like "variation" or a number
		norm: num(raw.norm),
		total_diff: num(raw.total_diff),
		entries: (raw.entries ?? []).map((e: any) => ({
			type: e.type,
			p_diff: num(e.p_diff),
			s_diff: num(e.s_diff),
			p_avg: num(e.p_avg),
			s_ref_diff: num(e.s_ref_diff),
			shift_score: num(e.shift_score)
		}))
	};
}
