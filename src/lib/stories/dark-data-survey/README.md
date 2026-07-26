# Dark Data Survey - "A Taste for Privacy"

An interactive data story exploring how privacy preferences vary across demographics and institutional contexts, based on survey data from University of Vermont undergraduate students.

## Story Overview

**Title:** A Taste for Privacy
**Subtitle:** When do people give up their privacy?
**Authors:** Jonathan St-Onge, Juniper Lovato

### Research Question

The story investigates how young people's willingness to share personally identifiable information (PII) varies across different institutions and relationships. It introduces the concept of **privacy construal** - the idea that comfort with sharing data depends on the perceived distance from oneself.

### Key Findings

1. **Social Media Privacy Settings**: Most college students set their accounts to private, followed by mixed, then public. More social media use correlates with less private settings.

2. **Platform Trust Paradox**: Single-platform users are less trusting of institutions than average. Users of 4+ platforms trust social media companies with their PII more than police or even neighbors.

3. **Demographic Disparities**: Privacy preferences vary by gender and by adverse childhood experiences (ACE scores) — at high ACE scores, relatives become one of the least trusted groups for sharing data.

4. **Circles of Trust**: The story visualizes "circles of trust" showing relative comfort levels sharing PII with different institutions (relatives, government, police, social media platforms, etc.), paired with a **data sonification** — each institutional group plays a note whose tempo tracks its trust level.

## Migration Note

This is the **static** version of the story, migrated from the `dark-data-sonify` branch of the previous project (`complex-stories-dev`). The original participatory survey infrastructure (browser fingerprinting, FastAPI/PostgreSQL persistence, live survey questions) was intentionally **not** migrated — the visualizations here are driven entirely by pre-aggregated CSVs.

## File Structure

```
dark-data-survey/
├── README.md
├── components/
│   ├── Index.svelte                  # Main story component (scrolly-kit layouts)
│   ├── TrustEvo.svelte               # "Circles of trust" visualization
│   ├── TrustSonification.svelte      # Tone.js sonification engine
│   ├── TrustDistributionChart.svelte # Ranked institution trust bars (overlay)
│   ├── ACESSlider.svelte             # ACE-score slider (bits-ui)
│   ├── Dashboard.svelte              # Explore-the-data section (desktop only)
│   └── WaffleChart.svelte            # Intro waffle chart (svelteplot)
├── data/
│   ├── copy.json                     # Story content and scrolly steps
│   ├── taste_for_privacy_aggregated.csv  # Gender/ACES aggregates (scrolly + dashboard)
│   ├── privacy_settings_aggregated.csv   # Privacy setting × platform count (waffle chart)
│   ├── process_privacy_settings.py   # Loader: dfall.csv → privacy_settings_aggregated.csv
│   ├── dfall.csv                     # ⚠ RAW survey responses — gitignored, never commit
│   └── sounds/soft-piano.wav         # Sampler source for the sonification
├── state.svelte.ts                   # Shared audio enable/toggle state
└── utils/institutionColors.js        # Institution → color mapping
```

## Sonification

The `TrustSonification` component maps the 17 trust categories into six musical groups (intimate, professional, semi-institutional, sensitive, commercial, unknown). Each group loops a piano note: **slower notes = more trust, faster notes = more suspicion**. Highlighting an institution isolates its group and pitches the note per-institution. Audio only starts after the reader explicitly enables it (WebAudio requires a user gesture).
