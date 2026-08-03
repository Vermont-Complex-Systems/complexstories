<script>
  /**
   * TraceStrip — the log-book of a book trace, and the beat's readable half:
   * danger over narrative time, epoch-colored with the same reading-time ramp
   * as the plane's wake, with
   *   - a Book axis (tick per book boundary, sparse roman numerals) — data
   *     from <book>_chapters.csv, not hand-placed
   *   - famous-episode landmarks that appear as the wake reaches them, so a
   *     reader can VERIFY the instrument against scenes they already know
   *   - the coverage band underneath (how much of each window the lens sees)
   *
   * trace: rows of { T, power, danger, structure, coverage }
   * books: [{ label: 'IX', frac: 0..1 }]      — every boundary
   * marks: [{ name: 'Polyphemus', frac }]     — the famous episodes
   * reveal 0..1 draws the line in step with the wake.
   */
  import { epochColor } from './Ousiograms.svelte';

  let {
    trace = [],
    books = [],
    marks = [],
    reveal = 1,
    width = 560,
    height = 140,
    dim = 'danger',            // which trace column to draw
    title = null,              // defaults to "<dim> over the telling"; '' hides
    coverage = true,           // the grey lens-coverage band
    extent = null,             // shared y-scale { lo, hi } (gallery rule);
                               //   null = auto per strip
    yTicks = false,            // gallery-style y grid, labels, and mean line
    onseek = null // (frac 0..1) => void — makes the strip a scrubber
  } = $props();

  function handleSeek(ev) {
    if (!onseek) return;
    const rect = ev.currentTarget.getBoundingClientRect();
    const frac = (ev.clientX - rect.left - padL) / innerW;
    onseek(Math.max(0, Math.min(1, frac)));
  }

  function handleKey(ev) {
    if (!onseek) return;
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
      ev.preventDefault();
      onseek(Math.max(0, Math.min(1, reveal + (ev.key === 'ArrowRight' ? 0.05 : -0.05))));
    }
  }

  const PAD = { right: 10, bottom: 32, left: 10 };
  const EPOCHS = 10;
  const COV_H = 12; // coverage band height, tucked under the danger line
  const NUMERALS = ['I', 'V', 'IX', 'XIII', 'XVII', 'XXI']; // sparse book labels

  let titleText = $derived(title ?? `${dim} over the telling`);

  // Every reserved band is conditional — a bare strip (no title, no book
  // axis, no coverage) gives nearly all its height to the line itself.
  let padTop = $derived(marks.length ? 44 : titleText ? 20 : 8);
  // Y tick labels need a left gutter; the book axis needs bottom room.
  let padL = $derived(yTicks ? 40 : PAD.left);
  let padBottom = $derived(books.length ? 32 : coverage ? 14 : 6);
  let covH = $derived(coverage ? COV_H : 0);

  let n = $derived(trace.length);
  let innerW = $derived(width - padL - PAD.right);
  let innerH = $derived(height - padTop - padBottom - covH);
  let base = $derived(height - padBottom); // bottom of the coverage band

  let computedExtent = $derived.by(() => {
    let lo = Infinity, hi = -Infinity, cmax = 0;
    for (const r of trace) {
      if (r[dim] < lo) lo = r[dim];
      if (r[dim] > hi) hi = r[dim];
      if (r.coverage > cmax) cmax = r.coverage;
    }
    const pad = (hi - lo) * 0.12 || 1;
    return { lo: lo - pad, hi: hi + pad, cmax: cmax || 1 };
  });
  let ext = $derived(extent ? { ...extent, cmax: computedExtent.cmax } : computedExtent);

  // gallery-style furniture: a SPARSE grid (2-3 rules, step adapted to the
  // strip's own range) + the mean rule
  let ytickVals = $derived.by(() => {
    if (!yTicks) return [];
    const range = ext.hi - ext.lo;
    const steps = [0.01, 0.02, 0.04, 0.05, 0.1, 0.2];
    const step = steps.find((s) => range / s <= 3.5) ?? 0.2;
    const out = [];
    for (let v = Math.ceil(ext.lo / step) * step; v < ext.hi; v += step) {
      out.push(Math.round(v * 1000) / 1000);
    }
    return out;
  });
  let meanVal = $derived.by(() => {
    if (!yTicks || !n) return 0;
    let s = 0;
    for (const r of trace) s += r[dim];
    return s / n;
  });

  const px = (i) => padL + (i / (n - 1)) * innerW;
  const fx = (frac) => padL + frac * innerW;
  const py = (d) => padTop + (1 - (d - ext.lo) / (ext.hi - ext.lo)) * innerH;

  let upto = $derived(Math.max(2, Math.round(n * reveal)));

  let segs = $derived.by(() => {
    if (!n || reveal <= 0) return [];
    const per = Math.ceil(n / EPOCHS);
    const out = [];
    for (let s = 0; s < EPOCHS; s++) {
      const a = s * per;
      if (a >= upto - 1) break;
      const b = Math.min(a + per + 1, upto);
      const rows = trace.slice(a, b);
      if (rows.length < 2) continue;
      out.push({
        d: 'M' + rows.map((r, j) => `${px(a + j).toFixed(1)},${py(r[dim]).toFixed(1)}`).join('L'),
        color: epochColor(s / (EPOCHS - 1))
      });
    }
    return out;
  });

  let covD = $derived.by(() => {
    if (!n) return '';
    let d = `M${padL},${base}`;
    for (let i = 0; i < upto; i++) {
      d += `L${px(i).toFixed(1)},${(base - (trace[i].coverage / ext.cmax) * COV_H).toFixed(1)}`;
    }
    d += `L${px(upto - 1).toFixed(1)},${base}Z`;
    return d;
  });

  // Episodes stagger between two label rows so close neighbors don't collide.
  let visibleMarks = $derived(
    marks
      .filter((m) => reveal >= m.frac - 1e-6)
      .map((m, i) => ({ ...m, row: i % 2, x: fx(m.frac) }))
  );

  // Explore-mode robustness: some books have hundreds of chapters (stride the
  // ticks) and labels that restart per part (suppress numerals — dup labels
  // would print stacked Is and Vs).
  let bookTicks = $derived.by(() => {
    if (books.length <= 48) return books;
    const stride = Math.ceil(books.length / 48);
    return books.filter((_, i) => i % stride === 0);
  });
  let showNumerals = $derived(new Set(books.map((b) => b.label)).size === books.length);
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -- tabindex and role="slider"
     are both gated on the same `onseek` prop: whenever it's focusable it IS
     interactive (click + arrow-key seeking) -->
<svg
  {width}
  {height}
  viewBox="0 0 {width} {height}"
  class:seekable={onseek}
  onclick={handleSeek}
  onkeydown={handleKey}
  tabindex={onseek ? 0 : undefined}
  role={onseek ? 'slider' : undefined}
  aria-label={onseek ? 'reading position' : undefined}
  aria-hidden={onseek ? undefined : 'true'}
  aria-valuemin={onseek ? 0 : undefined}
  aria-valuemax={onseek ? 100 : undefined}
  aria-valuenow={onseek ? Math.round(reveal * 100) : undefined}
>
  {#if titleText}
    <text class="label" x={padL} y={11}>{titleText}</text>
  {/if}

  {#if yTicks}
    {#each ytickVals as v (v)}
      <line class="ygrid" x1={padL} x2={width - PAD.right} y1={py(v)} y2={py(v)} />
      <text class="ytick" x={padL - 5} y={py(v)} text-anchor="end" dy="0.32em">{v.toFixed(2)}</text>
    {/each}
    {#if n}
      <line class="mid" x1={padL} x2={width - PAD.right} y1={py(meanVal)} y2={py(meanVal)} />
    {/if}
  {/if}

  {#if coverage}
    <path class="cov" d={covD} />
  {/if}

  {#each segs as seg, i (i)}
    <path class="line" d={seg.d} stroke={seg.color} />
  {/each}
  {#if n && reveal > 0}
    <circle class="head" cx={px(upto - 1)} cy={py(trace[upto - 1][dim])} r={3} />
  {/if}

  <!-- episode landmarks: the verification layer -->
  {#each visibleMarks as m (m.name)}
    <line class="guide" x1={m.x} y1={padTop - 4} x2={m.x} y2={base} />
    <text
      class="episode"
      x={m.x}
      y={padTop - 8 - m.row * 11}
      text-anchor={m.frac > 0.86 ? 'end' : m.frac < 0.04 ? 'start' : 'middle'}
    >{m.name}</text>
  {/each}

  <!-- Book axis: a tick per boundary, sparse numerals -->
  {#each bookTicks as b, i (i)}
    <line class="book-tick" x1={fx(b.frac)} y1={base + 3} x2={fx(b.frac)} y2={base + 8} />
    {#if showNumerals && NUMERALS.includes(b.label)}
      <text class="book-num" x={fx(b.frac)} y={base + 19} text-anchor="middle">{b.label}</text>
    {/if}
  {/each}
  {#if books.length}
    <text class="label" x={padL} y={height - 3}>Book →</text>
  {/if}
  {#if coverage}
    <text class="label" x={width - PAD.right} y={height - 3} text-anchor="end">grey band = lens coverage</text>
  {/if}
</svg>

<style>
  svg {
    display: block;
  }

  svg.seekable {
    cursor: pointer;
  }

  svg.seekable:focus-visible {
    outline: 2px solid var(--ousio-accent, #b3452c);
    outline-offset: 2px;
  }

  .line {
    fill: none;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .cov {
    fill: color-mix(in srgb, var(--ousio-ink, #1a2340) 14%, transparent);
  }

  .head {
    fill: var(--ousio-paper, #faf8f2);
    stroke: var(--ousio-ink, #1a2340);
    stroke-width: 1.2;
  }

  .guide {
    stroke: color-mix(in srgb, var(--ousio-ink, #1a2340) 30%, transparent);
    stroke-dasharray: 2 3;
  }

  .episode {
    font-family: var(--ousio-font, ui-serif, Georgia, serif);
    font-size: 9.5px;
    font-style: italic;
    fill: var(--ousio-ink, #1a2340);
  }

  .ygrid {
    stroke: color-mix(in srgb, var(--ousio-ink, #1a2340) 8%, transparent);
  }

  .ytick {
    font-size: 8px;
    font-variant-numeric: tabular-nums;
    fill: color-mix(in srgb, var(--ousio-ink, #1a2340) 55%, transparent);
  }

  .mid {
    stroke: color-mix(in srgb, var(--ousio-ink, #1a2340) 16%, transparent);
    stroke-dasharray: 2 4;
  }

  .book-tick {
    stroke: color-mix(in srgb, var(--ousio-ink, #1a2340) 35%, transparent);
  }

  .book-num {
    font-family: var(--ousio-font, ui-serif, Georgia, serif);
    font-size: 8.5px;
    fill: color-mix(in srgb, var(--ousio-ink, #1a2340) 60%, transparent);
    font-variant-numeric: tabular-nums;
  }

  .label {
    font-family: var(--ousio-font, ui-serif, Georgia, serif);
    font-size: 9.5px;
    letter-spacing: 0.03em;
    fill: color-mix(in srgb, var(--ousio-ink, #1a2340) 65%, transparent);
  }
</style>
