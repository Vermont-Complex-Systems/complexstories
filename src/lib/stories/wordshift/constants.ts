// Static catalog for the widgets. Values come from the Storywrangler registry
// (manifest.availability + filter_values) for each platform's ngrams dataset;
// see the storywrangler-sveltekit skill and `GET /registry/{domain}/{dataset}`.

import type { Granularity } from './dates';

/** Countries with coverage in wikimedia/ngrams. "All" is the global corpus. */
export const COUNTRIES = [
	'All',
	'Australia',
	'Bulgaria',
	'Canada',
	'Finland',
	'India',
	'Norway',
	'Philippines',
	'Romania',
	'United Kingdom',
	'United States'
] as const;

export type Country = (typeof COUNTRIES)[number];

/** Wikipedia ngrams are English (enwiki), so labMT_English is always correct.
 *  We pin lang=en on the other platforms too, so the English lexicon holds. */
export const LEXICON = 'labMT_English';

/** How many top words (by |shift|) to render in the chart. */
export const WORDSHIFT_LIMIT = 50;

/** Shifterator's neutral-word stop lens ("lo,hi"): words whose labMT score falls
 *  in [4, 6] (the neutral band) are dropped before the shift is computed, so it
 *  focuses on clearly positive/negative words. */
export const STOP_LENS = '4,6';

/**
 * One comparison platform. Each system is a `{ start, end }` span sent to the
 * endpoint as the `dates` string (single day when start === end, else
 * "start,end"). The datasets differ in a few ways, captured here:
 *
 *  - `sizeParam` — the n-gram-size filter is `ngram_size` on wikimedia/twitter,
 *    `n` on bluesky/reddit. Always 1 (labMT is single-word).
 *  - `lang` — bluesky/twitter/reddit need an explicit language; wikimedia is
 *    enwiki-only and takes none.
 *  - `apiGranularity` — a wikimedia-only rollup param (daily); a daily range
 *    aggregates correctly, so it's the only value we ever pass.
 *  - `hasEntity` — only wikimedia has a country axis.
 *  - `granularities` — the date spans that reliably return data, first = default.
 *    Wikimedia is dense daily (day/week/month); twitter is Mongo single-day only;
 *    bluesky/reddit are weekly-stored, so day 404s (week/month only).
 *  - `min`/`max` — the availability window (en) from the registry.
 */
export interface Platform {
	label: string;
	domain: string;
	dataset: string;
	sizeParam: 'ngram_size' | 'n';
	lang: string | null;
	apiGranularity: string | null;
	hasEntity: boolean;
	granularities: Granularity[];
	min: string;
	max: string;
	defaults: {
		s1: { country?: string; start: string; end: string };
		s2: { country?: string; start: string; end: string };
	};
}

export const PLATFORM_KEYS = ['wikipedia', 'bluesky', 'twitter', 'reddit'] as const;
export type PlatformKey = (typeof PLATFORM_KEYS)[number];

export const GRANULARITY_LABELS: Record<Granularity, string> = {
	day: 'Day',
	week: 'Week',
	month: 'Month'
};

export const PLATFORMS: Record<PlatformKey, Platform> = {
	wikipedia: {
		label: 'Wikipedia',
		domain: 'wikimedia',
		dataset: 'ngrams',
		sizeParam: 'ngram_size',
		lang: null,
		apiGranularity: 'daily',
		hasEntity: true,
		granularities: ['day', 'week', 'month'],
		min: '2024-09-30',
		max: '2026-07-18',
		defaults: {
			s1: { country: 'United States', start: '2024-11-06', end: '2024-11-06' },
			s2: { country: 'United States', start: '2025-09-10', end: '2025-09-10' }
		}
	},
	bluesky: {
		label: 'Bluesky',
		domain: 'bluesky',
		dataset: 'ngrams',
		sizeParam: 'n',
		lang: 'en',
		apiGranularity: null,
		hasEntity: false,
		granularities: ['week', 'month'],
		min: '2024-12-02',
		max: '2026-01-04',
		defaults: {
			s1: { start: '2025-01-06', end: '2025-01-12' },
			s2: { start: '2025-06-02', end: '2025-06-08' }
		}
	},
	twitter: {
		label: 'Twitter',
		domain: 'twitter',
		dataset: 'ngrams',
		sizeParam: 'ngram_size',
		lang: 'en',
		apiGranularity: null,
		hasEntity: false,
		granularities: ['day'],
		min: '2008-09-09',
		max: '2023-06-01',
		defaults: {
			s1: { start: '2020-03-15', end: '2020-03-15' },
			s2: { start: '2020-11-03', end: '2020-11-03' }
		}
	},
	reddit: {
		label: 'Reddit',
		domain: 'reddit',
		dataset: 'ngrams',
		sizeParam: 'n',
		lang: 'en',
		apiGranularity: null,
		hasEntity: false,
		granularities: ['week', 'month'],
		min: '2005-12-01',
		max: '2022-12-31',
		defaults: {
			s1: { start: '2016-11-07', end: '2016-11-13' },
			s2: { start: '2016-06-06', end: '2016-06-12' }
		}
	}
};
