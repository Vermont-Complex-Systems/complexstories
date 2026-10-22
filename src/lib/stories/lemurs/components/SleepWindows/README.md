# SleepWindows

A Svelte 5 + D3 component. Each participant's average sleep window is drawn as a hairline from falling asleep to waking up. The lines are stacked and sorted by sleep midpoint or by duration. When the sort changes, the rows animate to their new positions.

## Install

Copy this folder into `src/lib/`. The component only needs `d3`, which you already use:

```
src/lib/SleepWindows/
  SleepWindows.svelte     component
  sleepWindows.data.js    529 reconstructed rows (from Fig. 6)
  README.md
```

The component script uses `lang="ts"` for type annotations only. Svelte 5 compiles that without any extra setup, so it works in plain JS projects too.

## Basic use

```svelte
<script>
  import SleepWindows from '$lib/SleepWindows/SleepWindows.svelte';
  import data from '$lib/SleepWindows/sleepWindows.data.js';
</script>

<SleepWindows {data} />
```

## Driving it from a scrollytelling story

`sortBy` and `highlight` are bindable, so story steps can control the chart. Hide the built-in controls with `showControls={false}`.

```svelte
<script>
  import SleepWindows from '$lib/SleepWindows/SleepWindows.svelte';
  import data from '$lib/SleepWindows/sleepWindows.data.js';

  let step = $state(0);                 // set by your scroll observer
  const sortBy = $derived(step >= 2 ? 'duration' : 'midpoint');
  const highlight = $derived(step === 1 ? 511 : null);   // spotlight one sleeper
</script>

<div class="sticky">
  <SleepWindows {data} {sortBy} {highlight} showControls={false} showStats={false} />
</div>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `data` | `{start, end, midpoint, duration}[]` | required | Hours relative to midnight. A negative `start` means the evening before (−1.5 is 10:30 PM). |
| `sortBy` | `'midpoint' \| 'duration'` | `'midpoint'` | Bindable. |
| `highlight` | `number \| null` | `null` | Bindable. An index into `data` to spotlight. Hovering overrides it. |
| `layout` | `'linear' \| 'radial'` | `'linear'` | `radial` draws a 24-hour clock face (midnight at the top) with one ring per participant, sorted from the centre outward. `domain` is ignored there; the face always spans 24 h. |
| `showControls` | `boolean` | `true` | Sort toggle. |
| `showLegend` | `boolean` | `true` | Duration ramp and midpoint key. |
| `showStats` | `boolean` | `true` | Four summary figures under the chart. |
| `showTable` | `boolean` | `true` | Collapsible table by chronotype quintile (accessible alternative to the chart). |
| `height` | `number \| null` | `null` | `null` scales with width (0.62 × width, clamped to 420–620 px). |
| `domain` | `[number, number]` | `[-3, 16]` | Clock range on the x axis, 9 PM to 4 PM. |
| `durationDomain` | `[number, number]` | `[6, 12]` | Hours mapped onto the colour ramp. |
| `nightBand` | `[number, number] \| null` | `[0, 6]` | Shaded band from midnight to 6 AM. `null` hides it. |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'light'` | `auto` follows the OS setting, or `data-theme="dark"` / `"light"` on `<html>`. |
| `ariaLabel` | `string` | description | Screen-reader label for the chart. |

## Theming

Every colour and font is a CSS custom property. Override them from a parent element:

```svelte
<div style="--sw-lo:#e9b7d9; --sw-hi:#6b1d5e; --sw-accent:#0a7; --sw-font:Georgia, serif">
  <SleepWindows {data} />
</div>
```

Tokens: `--sw-surface --sw-ink --sw-ink2 --sw-muted --sw-grid --sw-axis --sw-ring --sw-night --sw-lo --sw-hi --sw-mid --sw-accent --sw-font --sw-mono --sw-duration`

`--sw-duration` sets the length of the sort animation (default `600ms`). The animation is turned off when the reader has reduced motion enabled.

Fonts fall back to the system font. To get the IBM Plex look from the artifact, load IBM Plex Sans and IBM Plex Mono in your app.

## Interaction

- Hover a row to see that participant's asleep, awake, midpoint and duration times.
- Keyboard: focus the chart, then use ↑ and ↓ to move between rows, Home and End to jump to the first and last row, and Esc to clear.

## About the data

The rows are reconstructed by digitising Fig. 6 ("Chronotype and bedtime"). They reproduce the published distribution: median midpoint about 5:00 AM, r(start, midpoint) about 0.88, r(end, midpoint) about 0.90, r(duration, midpoint) about 0.05. Individual rows are synthetic. The sample size of 529 is an estimate read from the histogram, and the bar heights fit about 543 slightly better.
