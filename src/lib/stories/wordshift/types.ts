// Shape of the `/storywrangler/wordshift` response (a port of Shifterator's
// weighted-average sentiment word shift). See api-reference/storywrangler.

/** One word's contribution to the change in average sentiment. */
export interface WordShiftEntry {
	/** The n-gram / token. */
	type: string;
	/** Frequency (probability) difference: >0 = more prevalent in system 2. */
	p_diff: number;
	/** Score difference (0 for a single-lexicon weighted-average shift). */
	s_diff: number;
	/** Average frequency of the word across the two systems. */
	p_avg: number;
	/** Word's score relative to the reference: >0 = relatively positive. */
	s_ref_diff: number;
	/** Signed total contribution: >0 = pushed system 2's sentiment up. */
	shift_score: number;
}

export interface WordShiftResponse {
	entries: WordShiftEntry[];
	/** Weighted-mean sentiment of system 1 (the baseline). */
	s_avg_1: number;
	/** Weighted-mean sentiment of system 2. */
	s_avg_2: number;
	/** The reference score the shift is partitioned around. */
	reference_value: number;
	/** Normalization mode label (e.g. "variation") or a numeric constant. */
	normalization: number | string;
	/** Σ|δΦ| over all types — the constant per-type/component bars divide by. */
	norm: number;
	total_diff: number;
	/** Component sums keyed by the four shift categories (may be partial). */
	component_sums?: Record<string, number>;
	meta: {
		system1: { entity: string | null; dates: string | null; types: number };
		system2: { entity: string | null; dates: string | null; types: number };
		lexicon: string;
		weight: string;
		domain: string;
		dataset: string;
	};
}

/** A single system (one axis of the comparison): an optional country over a date
 *  span. `country` is only meaningful on platforms with an entity axis (Wikipedia).
 *  `start`/`end` are ISO 'YYYY-MM-DD'; equal for a single day, else a range. */
export interface SystemSelection {
	/** Country name, used as the entity local_id (e.g. "United States"). */
	country?: string;
	start: string;
	end: string;
}
