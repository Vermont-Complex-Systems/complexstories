<script>
    import { Plot, WaffleX, groupY } from 'svelteplot';
    import settings from '../data/privacy_settings_aggregated.csv';

    const SETTINGS = ['private', 'mixed', 'public'];

    // Bin platform counts (0, 1, 2, 3+) and normalize each bin to 100 squares,
    // so rows are directly comparable despite very different group sizes.
    const byBin = {};
    for (const d of settings) {
        // String() so the y scale is inferred as band (vite's dsv plugin
        // coerces platform_count to a number)
        const bin = +d.platform_count >= 3 ? '3+' : String(d.platform_count);
        byBin[bin] ??= { private: 0, mixed: 0, public: 0 };
        byBin[bin][d.privacy_setting] += +d.respondents;
    }

    // Largest-remainder rounding (integer percentages summing to exactly 100),
    // expanded to one row per percentage point for the groupY count transform.
    const units = Object.entries(byBin).flatMap(([bin, counts]) => {
        const total = SETTINGS.reduce((sum, s) => sum + counts[s], 0);
        const exact = SETTINGS.map((s) => (counts[s] / total) * 100);
        const pct = exact.map(Math.floor);
        const leftover = 100 - pct.reduce((a, b) => a + b, 0);
        [...exact.keys()]
            .sort((a, b) => (exact[b] - pct[b]) - (exact[a] - pct[a]))
            .slice(0, leftover)
            .forEach((i) => pct[i]++);
        return SETTINGS.flatMap((s, i) =>
            Array.from({ length: pct[i] }, () => ({ platforms: bin, setting: s }))
        );
    });
</script>

<Plot
    height={320}
    x={{ grid: true, label: '% of respondents (1 square = 1%)' }}
    y={{ label: 'Platforms used', type: 'band' }}
    color={{ legend: true, domain: SETTINGS }}>
    <WaffleX
        gap={2}
        borderRadius={2}
        {...groupY(
            {
                data: units,
                y: 'platforms',
                fill: 'setting'
            },
            { x: 'count' }
        )} />
</Plot>
