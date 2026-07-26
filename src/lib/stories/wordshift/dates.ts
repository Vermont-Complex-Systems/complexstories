// Partition helpers for the date pickers — adapted from the wikipedia-front-end
// allotaxParams state. A platform's [min, max] window is turned into the list of
// available weeks (Mondays / min-aligned week starts) or months the pickers show,
// and the snap helpers keep a selection valid when the granularity changes.

export type Granularity = 'day' | 'week' | 'month';

/** ISO-week Mondays on or after `min`, through `max`. (Bluesky is stored one ISO
 *  week per file; Reddit accepts arbitrary ranges, so Monday-aligned is safe for
 *  both.) */
export function getAvailableWeeksFromRange(minStr: string, maxStr: string): string[] {
	const result: string[] = [];
	let startIso = snapToWeekStart(minStr);
	if (startIso < minStr) {
		startIso = new Date(new Date(startIso + 'T00:00:00Z').getTime() + 7 * 86400000)
			.toISOString()
			.split('T')[0];
	}
	let current = new Date(startIso + 'T00:00:00Z');
	const max = new Date(maxStr + 'T00:00:00Z');
	while (current <= max) {
		result.push(current.toISOString().split('T')[0]);
		current = new Date(current.getTime() + 7 * 86400000);
	}
	return result;
}

/** First-of-month strings from `min`'s month through `max`'s month. */
export function getAvailableMonthsFromRange(minStr: string, maxStr: string): string[] {
	const result: string[] = [];
	let [y, m] = minStr.split('-').map(Number);
	const [maxY, maxM] = maxStr.split('-').map(Number);
	while (y < maxY || (y === maxY && m <= maxM)) {
		result.push(`${y}-${String(m).padStart(2, '0')}-01`);
		m++;
		if (m > 12) {
			m = 1;
			y++;
		}
	}
	return result;
}

export function snapToWeekStart(str: string): string {
	const d = new Date(str + 'T00:00:00Z');
	const dow = d.getUTCDay();
	const back = dow === 0 ? 6 : dow - 1;
	return new Date(d.getTime() - back * 86400000).toISOString().split('T')[0];
}

export function snapToWeekEnd(str: string): string {
	const d = new Date(str + 'T00:00:00Z');
	const dow = d.getUTCDay();
	const fwd = dow === 0 ? 0 : 7 - dow;
	return new Date(d.getTime() + fwd * 86400000).toISOString().split('T')[0];
}

export function snapToMonthStart(str: string): string {
	return str.slice(0, 7) + '-01';
}

export function snapToMonthEnd(str: string): string {
	const [y, m] = str.split('-').map(Number);
	return new Date(Date.UTC(y, m, 0)).toISOString().split('T')[0];
}

/** Clamp an ISO day into [min, max]. */
export function clampDay(iso: string, min: string, max: string): string {
	if (iso < min) return min;
	if (iso > max) return max;
	return iso;
}

/** Re-derive a {start,end} span for `gran` from an existing anchor date, clamped
 *  to the platform window. Used when the granularity or platform changes. */
export function spanFor(gran: Granularity, anchor: string, min: string, max: string): {
	start: string;
	end: string;
} {
	if (gran === 'month') {
		const start = clampDay(snapToMonthStart(anchor), min, max);
		return { start, end: clampDay(snapToMonthEnd(anchor), min, max) };
	}
	if (gran === 'week') {
		const start = clampDay(snapToWeekStart(anchor), min, max);
		return { start, end: clampDay(snapToWeekEnd(anchor), min, max) };
	}
	const day = clampDay(anchor, min, max);
	return { start: day, end: day };
}
