# SleepSignals

A Svelte 5 + D3 component built from LEMURS Figure 1 (sleep). It has two views:

- **`minutes`**: an hour × minute grid showing when students fall asleep and get up, with a minute-of-hour profile under each grid. Get-up times spike at :00/:01, :30/:31, :15/:16 and :45/:46, which is where alarms go off. Bedtimes show no such pull.
- **`arcs`**: the two stable heart-rate arc clusters (k = 2) across the night. Each arc is drawn as its centre line plus a ribbon showing how much it moved across resampled subsets. A dot marks each arc's lowest point. You can switch on the unstable k = 3 spread behind them.

## Install

Copy this folder into `src/lib/`. It only needs `d3`.

```svelte
<script>
  import SleepSignals from '$lib/SleepSignals/SleepSignals.svelte';
  import data from '$lib/SleepSignals/sleepSignals.data.js';
</script>

<SleepSignals {data} />
```

## Scrollytelling

```svelte
<script>
  let step = $state(0);
  const view = $derived(step < 2 ? 'minutes' : 'arcs');
  const showSpread = $derived(step >= 3);
</script>

<SleepSignals {data} {view} {showSpread} showControls={false} />
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `data` | `SleepSignalsData` | required | The shape of `sleepSignals.data.js`. |
| `view` | `'minutes' \| 'arcs'` | `'minutes'` | Bindable. |
| `arcs` | `('lateMinimum' \| 'hammock')[]` | both | Which arcs to draw. An arc added later (e.g. on a scroll step) draws itself in. |
| `showSpread` | `boolean` | `false` | Bindable. Shows the k = 3 spread behind the arcs. |
| `showControls` | `boolean` | `true` | View toggle, plus the legend or spread checkbox. |
| `showSummary` | `boolean` | `true` | One-sentence computed takeaway under each chart. |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'light'` | `auto` follows the OS setting, or `data-theme` on `<html>`. |

## Theming

Override these CSS variables from a parent element:

`--ss-surface --ss-ink --ss-ink2 --ss-muted --ss-grid --ss-axis --ss-lo --ss-hi` (grid ramp) `--ss-bar --ss-bar-alarm` (minute profile) `--ss-s1 --ss-s2` (the two arcs) `--ss-spread --ss-accent --ss-font --ss-mono`

## About the data

The data was digitised from the published figure.

- **Clock values:** each minute's value is its position on the figure's magma colour scale, from 0 to 1. The values are relative and rank-preserving, but they are not counts, so read ratios as "higher on the colour scale" rather than "N times as many people".
- **Clock face:** the source is a 12-hour clock face with no AM/PM, so hours are labelled 1–12.
- **Where the minute profile comes from:** it averages only the busiest hours, meaning hours whose mean is at least half the busiest hour's mean.
- **Finding each arc's low point:** the dot ignores steps 0–3, the settling-in period right after falling asleep. The hammock arc briefly dips there before its real mid-night trough.
