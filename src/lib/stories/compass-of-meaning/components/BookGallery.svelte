<script>
  /**
   * BookGallery — the coda: six book traces as small multiples of the
   * danger-over-reading-time strip. Built as an argument, not an appendix:
   *   - SHARED y-scale across all panels (Austen's flatness only means
   *     something at Frankenstein's scale)
   *   - panels ordered by mean danger, calmest first — the layout is the
   *     claim: genres are regions
   *   - x is reading time normalized to 0..1 (books differ 5x in length)
   *   - the Odyssey panel is highlighted as the voyage just sailed; the
   *     Les Miserables panel doubles as a replication of the paper's Fig. 9
   *
   * Data: gallery_traces.csv / gallery_chapters.csv from book_gallery.py
   * (same lexicon, window, and step for every book — comparability is
   * enforced by the pipeline, the shared scale only makes it visible).
   */
  import traces from '../data/gallery_traces.csv';
  import chaptersRaw from '../data/gallery_chapters.csv';

  let { width = 640 } = $props();

  const NOTES = {
    'Pride and Prejudice': '',
    'The Odyssey': '',
    'Les Miserables': '',
    Frankenstein: ''
  };

  // Book lengths in 1-grams (from book_gallery.py's summary table). The x
  // axis is normalized per book so the panels align; the paper's panels use
  // absolute T — the length shown per panel keeps that information.
  const LENGTHS = {
    'The Odyssey': 121700,
    'Anna Karenina': 344700,
    'Pride and Prejudice': 117400,
    Dracula: 156000,
    Frankenstein: 69900,
    'Les Miserables': 557700
  };

  // group, downsample for rendering, and order by mean danger (calmest first)
  const books = (() => {
    const by = {};
    for (const r of traces) (by[r.label] ??= []).push(r);
    const out = [];
    for (const [label, rows] of Object.entries(by)) {
      const stride = Math.max(1, Math.ceil(rows.length / 700));
      const slim = rows.filter((_, i) => i % stride === 0);
      let sum = 0;
      let peak = rows[0];
      for (const r of rows) {
        sum += r.danger;
        if (r.danger > peak.danger) peak = r;
      }
      out.push({ label, rows: slim, mean: sum / rows.length, peak });
    }
    out.sort((a, b) => a.mean - b.mean);
    return out;
  })();

  // shared danger extent across ALL books — non-negotiable
  const extent = (() => {
    let lo = Infinity, hi = -Infinity;
    for (const r of traces) {
      if (r.danger < lo) lo = r.danger;
      if (r.danger > hi) hi = r.danger;
    }
    const pad = (hi - lo) * 0.08;
    return [lo - pad, hi + pad];
  })();

  // the Odyssey's slaughter landmark, from the chapters file (data, not
  // hand-placed); other panels get an unlabeled peak dot
  const slaughterT = chaptersRaw.find(
    (c) => c.label === 'The Odyssey' && String(c.chapter) === 'XXII'
  )?.t;

  const PAD = { top: 8, right: 150, bottom: 8, left: 44 };
  const ROW_H = 96;

  // shared y ticks in 0.04 steps over the common extent — the visible ruler
  // that makes every panel auditable against the paper's values
  const yTicks = (() => {
    const out = [];
    for (let v = Math.ceil(extent[0] / 0.04) * 0.04; v < extent[1]; v += 0.04) {
      out.push(Math.round(v * 100) / 100);
    }
    return out;
  })();

  let innerW = $derived(Math.max(200, width) - PAD.left - PAD.right);
  const px = $derived((t) => PAD.left + t * innerW);
  const py = (d) => PAD.top + (1 - (d - extent[0]) / (extent[1] - extent[0])) * (ROW_H - PAD.top - PAD.bottom);

  const lineD = (rows) =>
    'M' + rows.map((r) => `${px(r.t).toFixed(1)},${py(r.danger).toFixed(1)}`).join('L');

  const fmt = (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(3);
</script>

<figure class="gallery">
  {#each books as b (b.label)}
    {@const odyssey = b.label === 'The Odyssey'}
    <div class="panel" class:odyssey>
      <div class="head">
        <span class="title">{b.label}</span>
        {#if NOTES[b.label]}<span class="note">{NOTES[b.label]}</span>{/if}
        {#if LENGTHS[b.label]}
          <span class="len">{Math.round(LENGTHS[b.label] / 1000)}k 1-grams</span>
        {/if}
        <span class="mean">mean danger {fmt(b.mean)}</span>
      </div>
      <svg width={Math.max(200, width)} height={ROW_H} aria-hidden="true">
        {#each yTicks as v (v)}
          <line class="ygrid" x1={px(0)} x2={px(1)} y1={py(v)} y2={py(v)} />
          <text class="ytick" x={PAD.left - 6} y={py(v)} text-anchor="end" dy="0.32em">{v.toFixed(2)}</text>
        {/each}
        <line class="mid" x1={px(0)} x2={px(1)} y1={py(b.mean)} y2={py(b.mean)} />
        <path class="line" d={lineD(b.rows)} />
        <circle class="peak" cx={px(b.peak.t)} cy={py(b.peak.danger)} r={2.6} />
        {#if odyssey && slaughterT != null}
          <line class="slaughter" x1={px(slaughterT)} x2={px(slaughterT)} y1={PAD.top} y2={ROW_H - PAD.bottom} />
          <text class="episode" x={px(slaughterT) + 5} y={PAD.top + 9}>XXII — the slaughter</text>
        {/if}
      </svg>
    </div>
  {/each}
  <figcaption>
    Danger over reading time, one 10,000-word window at a time — same lens, same
    window, <strong>same y-scale</strong>, ordered calmest to most dangerous.
    Dots mark each book’s most dangerous stretch. Reading time is normalized per
    book (the paper’s panels use absolute 1-grams; each panel’s length is shown
    in its header).
  </figcaption>
</figure>

<style>
  .gallery {
    margin: 0;
    font-family: var(--ousio-font, ui-serif, Georgia, serif);
    color: var(--ousio-ink, #1a2340);
  }

  .panel {
    padding: 0.4rem 0 0.1rem 0;
    border-top: 1px solid color-mix(in srgb, var(--ousio-ink, #1a2340) 12%, transparent);
  }

  .panel.odyssey {
    background: color-mix(in srgb, var(--ousio-accent, #b3452c) 5%, transparent);
    border-top-color: color-mix(in srgb, var(--ousio-accent, #b3452c) 45%, transparent);
  }

  .head {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    padding: 0 10px;
    font-size: 0.82rem;
  }

  .title {
    font-weight: 600;
  }

  .note {
    font-style: italic;
    font-size: 0.72rem;
    color: color-mix(in srgb, var(--ousio-ink, #1a2340) 62%, transparent);
  }

  .panel.odyssey .note {
    color: var(--ousio-accent, #b3452c);
  }

  .len {
    font-size: 0.7rem;
    font-variant-numeric: tabular-nums;
    color: color-mix(in srgb, var(--ousio-ink, #1a2340) 45%, transparent);
  }

  .mean {
    margin-left: auto;
    font-size: 0.7rem;
    font-variant-numeric: tabular-nums;
    color: color-mix(in srgb, var(--ousio-ink, #1a2340) 55%, transparent);
  }

  .ygrid {
    stroke: color-mix(in srgb, var(--ousio-ink, #1a2340) 8%, transparent);
  }

  .ytick {
    font-size: 8.5px;
    font-variant-numeric: tabular-nums;
    fill: color-mix(in srgb, var(--ousio-ink, #1a2340) 55%, transparent);
  }

  svg {
    display: block;
  }

  .line {
    fill: none;
    stroke: var(--ousio-ink, #1a2340);
    stroke-width: 1.3;
    stroke-linejoin: round;
  }

  .panel.odyssey .line {
    stroke: var(--ousio-accent, #b3452c);
  }

  .mid {
    stroke: color-mix(in srgb, var(--ousio-ink, #1a2340) 14%, transparent);
    stroke-dasharray: 2 4;
  }

  .peak {
    fill: var(--ousio-accent, #b3452c);
  }

  .slaughter {
    stroke: color-mix(in srgb, var(--ousio-accent, #b3452c) 55%, transparent);
    stroke-dasharray: 2 3;
  }

  .episode {
    font-size: 9.5px;
    font-style: italic;
    fill: color-mix(in srgb, var(--ousio-ink, #1a2340) 75%, transparent);
  }

  figcaption {
    margin-top: 0.6rem;
    padding: 0 10px;
    font-size: 0.75rem;
    color: color-mix(in srgb, var(--ousio-ink, #1a2340) 60%, transparent);
  }
</style>
