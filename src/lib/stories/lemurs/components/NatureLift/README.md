# NatureLift

A Svelte 5 + D3 component built from LEMURS Figure 2 (nature, depression and heart-rate variability). It has three views:

- **`hrv`**: dumbbells comparing mean HRV in the observational period with the treatment period for each group, above one small multiple per group. Each small multiple shows weekly HRV with its 95% CI against the dashed overall average, with the treatment weeks shaded. Hovering one panel reads out the same week in all four.
- **`depression`**: a slope chart of depression score across low, medium and high perceived nature exposure, with 95% CIs. One group is emphasised; hover a line or click a chip to change it.
- **`map`**: the nature-exposure heat layer around campus, drawn on canvas, with a hover readout.

## Install

Copy this folder into `src/lib/`. It only needs `d3`.

```svelte
<script>
  import NatureLift from '$lib/NatureLift/NatureLift.svelte';
  import data from '$lib/NatureLift/natureLift.data.js';
</script>

<NatureLift {data} />
```

## Scrollytelling

```svelte
<script>
  let step = $state(0);
  const view = $derived(['map', 'depression', 'hrv', 'hrv'][step]);
  const week = $derived(step === 3 ? 20 : null);   // point at week 20 in every panel
</script>

<NatureLift {data} {view} {week} emphasis="Nature" showControls={false} />
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `data` | `NatureLiftData` | required | The shape of `natureLift.data.js`. |
| `view` | `'hrv' \| 'depression' \| 'map'` | `'hrv'` | Bindable. |
| `emphasis` | `Group \| null` | `'Nature'` | Bindable. The group highlighted in the dumbbells and slope chart; `null` shows all groups equally. |
| `week` | `number \| null` | `null` | Bindable. The week read out in every small multiple; hover sets it too. |
| `treatment` | `[number, number]` | `[14, 28]` | Treatment weeks, used for the shading and the before/after means. |
| `campus` | `{row, col} \| null` | `{row: 83, col: 64}` | Approximate campus pin on the map grid; `null` hides it. |
| `showWeekly` | `boolean` | `true` | In the `hrv` view, the weekly small multiples under the dumbbells. `false` leaves only the before/after means. |
| `showControls` | `boolean` | `true` | View toggle. |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'light'` | |

## Theming

Override these CSS variables from a parent element:

`--nl-control --nl-exercise --nl-nature --nl-therapy` (group colours) `--nl-avg --nl-map-lo --nl-map-hi --nl-surface --nl-ink --nl-ink2 --nl-muted --nl-grid --nl-axis --nl-trt --nl-accent --nl-font --nl-mono`

## About the data

The data was digitised from the published figure.

- **HRV lines:** each line was traced to sub-pixel precision. The traced overall-average line and the mean of the four group lines agree to within about 0.3 HRV in most weeks.
- **HRV bands:** the CI bands were recovered by unmixing the figure's translucent fills. Where several bands overlap, the band edges carry about ±0.5 HRV of uncertainty.
- **Hidden weeks:** a few weeks where one line is hidden under another are interpolated and flagged `interpolated: true`.
- **Map values:** each value is the colour hue of the source heat layer, running from 0 (red, least nature) to 1 (green, most nature). The values are relative, not a physical unit.
- **Map gaps:** gaps left by basemap lines and labels are filled from neighbouring cells (see `filledCells`).
- **Campus pin:** its position was read off the basemap label, so it is approximate.
