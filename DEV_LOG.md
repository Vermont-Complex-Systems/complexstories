# Dev Log

Project memory for agents. Newest entry first. One entry per work session or checkpoint.

<!-- dev-log:entries -->

## 2026-11-04 — Lemurs: section headers as full-width chapter breaks

- **Agent:** opencode / claude-haiku-5-5
- **Intent:** Stop section headers ("Sleep", "Nature", …) from being scroll steps. Each header is an independent full-width band, and each run of steps after it is its own scrolly section.
- **Code:**
  - `components/Chapter.svelte` (new): one scrolly section (sticky visual + steps). Owns its own step index and panel measurements, moved out of Index.
  - `components/Index.svelte`: groups `data.steps` into chapters at each `section` key. Renders a `header.chapter-head.full-bleed` band (theme-coloured top rule) before each chapter after the first. Steps before the first header form an untitled opening chapter. Sources note unchanged.
- **Verified:** `npm run check` 0 errors / 6 pre-existing warnings. Browser: 6 scrolly sections, 5 headers, each header 1440px wide at left 0 on a 1440px viewport. Step counts per section 3/5/3/2/4/3 = all 20 steps.
- **Open:**
  - Visual review of the header bands and section transitions not done.
  - Header band styling (surface2 background, 3.5rem top margin) is a first pass.
  - Each chapter's first step still shows its own chart when scrolled in; the chart does not carry over from the previous chapter.
- **Git:** uncommitted; same lemurs set as the previous entries plus the new `Chapter.svelte`. The `--vcsi-step-height: 150vh` line in the fullscreen layout was already present and is preserved in `Chapter.svelte`.

## 2026-11-04 — Lemurs: gaps between colour groups in sided splits

- **Agent:** opencode / claude-haiku-5-5
- **Intent:** Break the perfect square grid on the impairment and trauma steps by spacing the colour groups apart.
- **Code:** `components/UnitChart.svelte` `sidePositions()` starts a new run of columns (desktop) or rows (phones) at each group boundary and adds `GROUP_GAP` (0.75 cell) before it. The arrangement is re-centred in the shared 520-unit box. Plain grid steps are unchanged.
- **Verified:** `npm run check` 0 errors / 6 pre-existing warnings. Playwright: 35-unit gap between groups on desktop and phone; extents 440–495 units, inside the 520 box.
- **Open:** Partial runs at group edges leave a ragged edge on some steps; accept or tune `GROUP_GAP`.
- **Git:** uncommitted, same set as the previous lemurs entry.

## 2026-11-04 — Lemurs: fullscreen layout, social cohort, sided splits, step transitions

- **Agent:** opencode / claude-haiku-5-5
- **Intent:** Cohort step becomes a mingling crowd; switch the lemurs scrolly to a centred full-viewport layout; put the impairment and trauma splits left/right (top/bottom on phones); tween dots between steps.
- **Code:**
  - `components/SocialField.svelte` (new): canvas crowd for `motion: "social"` on the cohort step; dots walk to clusters, chat, and re-form. Reduced motion falls back to the static grid.
  - `components/Index.svelte`: `split-layout` → `fullscreen-layout`; charts measure a centred `.visual-wrap` (max 720px) so fit maths matches what is drawn; section headers keep their card.
  - `components/UnitChart.svelte`: `arrange: "sides"` (columns left→right on desktop, rows top→bottom under 768px); all grid-style steps share one 520-unit box so steps don't rescale; every dot transitions transform (900ms) and fill (500ms), reduced-motion excepted.
  - `data/copy.json`: `motion: "social"` on cohort; `arrange: "sides"` on impairment (order 1) and trauma (order 2).
- **Verified:** `npm run check` 0 errors / 6 pre-existing warnings. Playwright: hue dots average x≈102 vs rest x≈334 on desktop; top/bottom on a 390px phone; dots report `transition: fill, transform`; cohort canvas frames change between captures.
- **Open:**
  - `copy.json` was changed on disk outside this session once (subtitle changed; `motion: "social"` removed and re-added). Confirm the subtitle is intended.
  - The cohort crowd (canvas) does not tween into step 1; the dots appear at their grid slots.
  - Purpose-built chart steps (sleep, nature) do not tween between steps.
  - Steps 2 and 3 and section headers were not reviewed visually after the final CSS changes.
- **Git:** `main`; changes uncommitted (lemurs component/data files, new SocialField.svelte, DEV_LOG.md). `src/lib/data/stories.csv` and `src/lib/stories/story-corps/` were already uncommitted before this session.

## 2026-10-28 10:08 — Registered the Salem story thumbnail

- **Agent:** opencode / kimi-k3.1-pro
- **Intent:** Fix the missing Salem thumbnail on story cards.
- **Data:** Added `src/lib/assets/thumbnails/salem-witches.png`, copied from the existing valid static screenshot.
- **Why:** `Story.svelte` found no optimized Salem asset and fell back to a nonexistent `.jpg`; placing the PNG in the glob-imported thumbnail directory lets `<enhanced:img>` render it directly.
- **Verified:** The copied PNG opens successfully; `npm run check` passes with 0 errors and 6 existing warnings.
- **Open:** `npm run build` reaches 4906 transformed modules but fails on the unrelated unresolved `tone` import in `taste-for-privacy/components/TrustSonification.svelte`.
- **Git:** `main` @ `34969de`; unrelated `src/lib/data/stories.csv` changes remain uncommitted.

## 2026-10-27 15:49 — Made Salem illustrations mobile-responsive

- **Agent:** opencode / kimi-k3.1-pro
- **Intent:** Make every story illustration scale to small screens and remain centered on phones.
- **Code:** `src/lib/stories/salem-witches/components/Index.svelte` gives `.story-illo` fluid sizing and automatic horizontal margins; at 768px and below, paired illustrations stack vertically and the portrait grid becomes two centered columns.
- **Why:** Fluid width prevents large network illustrations from overflowing, while stacking and two-column portraits preserve readability instead of shrinking every image into a single row.
- **Verified:** `npm run check` passes with 0 errors and 6 existing warnings.
- **Open:** Browser visual review on a physical or emulated phone not run.
- **Git:** `main` @ `8853c85`.

## 2026-10-27 15:39 — Limited Salem self-loop rings to five

- **Agent:** opencode / kimi-k3.1-pro
- **Intent:** Draw five red self-accusation rings instead of seven.
- **Code:** `src/lib/stories/salem-witches/components/ScrollyPlot.svelte` limits `selfView` to the first five self-loop links before rendering.
- **Why:** The requested ring count is a presentational cap; retaining the first five is deterministic, and the source data remains unchanged.
- **Verified:** `npm run check` passes with 0 errors and 6 existing warnings.
- **Open:** The source JSON still contains seven distinct self-loop people; only the ring rendering is capped at five per request.
- **Git:** `main` @ `5900d56`; unrelated story changes remain uncommitted.

## 2026-10-27 10:08 — Intensified Salem illustration tilt animation

- **Agent:** opencode / kimi-k3.1-pro
- **Intent:** Make the paired header illustrations rotate faster and more dramatically.
- **Code:** `src/lib/stories/salem-witches/components/Index.svelte` shortens the alternating tilt durations from 1.6s/1.4s to 0.9s/0.8s and widens rotation from −2.5°…4.5° to −4.5°…8°.
- **Why:** Roughly doubling angular travel while shortening the cycle makes the existing motion noticeably livelier; reduced-motion behavior remains unchanged.
- **Verified:** `npm run check` passes with 0 errors and 6 existing warnings.
- **Open:** None for this change.
- **Git:** `main` @ `ac3acd9`; unrelated `copy.json` changes remain uncommitted.

## 2026-10-27 10:04 — Enlarged Salem header subtitle and spaced author line

- **Agent:** opencode / kimi-k3.1-pro
- **Intent:** Increase the StoryHeader subtitle size and add more space above the author text.
- **Code:** `src/lib/stories/salem-witches/components/Index.svelte` styles the header `h2` with `--vcsi-font-size-xl` (2.5rem on mobile) and gives `.author` a `--vcsi-space-xl` top margin.
- **Why:** The scrolly-kit reference requires `:global()` for elements rendered inside imported components; scoping those selectors under `.story` keeps the overrides local to Salem.
- **Verified:** `npm run check` passes with 0 errors and 7 existing warnings.
- **Open:** Browser visual review not run.
- **Git:** `main` @ `ac3acd9`; unrelated `copy.json` changes remain uncommitted.

## 2026-10-27 09:46 — Diversified Salem margin illustrations

- **Agent:** opencode / kimi-k3.1-pro
- **Intent:** Use four distinct side illustrations rather than repeating the first two.
- **Code:** `src/lib/stories/salem-witches/components/Index.svelte` imports `girl-demon.jpg` and `horns-girl.jpg` as `girlDemon` and `hornsGirl`, replacing the repeated conclusion decorations.
- **Verified:** `npm run check` passes with 0 errors and 7 pre-existing warnings.
- **Open:** None for this change.
- **Git:** `main` @ `ac3acd9`.

## 2026-10-27 09:41 — Added Salem margin illustrations

- **Agent:** opencode / kimi-k3.1-pro
- **Intent:** Spread `demonGirl` and `accuserGirl` illustrations down the sides of the story as non-interactive decoration.
- **Code:** `src/lib/stories/salem-witches/components/Index.svelte` anchors four decorative images outside the introduction, curve introduction, and conclusion prose; they are hidden below 1024px.
- **Why:** Anchoring decorations to prose sections keeps them clear of the full-width scrolly graphics while letting them scroll naturally with the story. Empty alt text, `aria-hidden`, and disabled pointer events keep them purely decorative.
- **Verified:** `npm run check` passes with 0 errors and 7 pre-existing warnings.
- **Open:** Browser visual review not run.
- **Git:** `main` @ `ac3acd9`.

## 2026-10-27 09:27 — Enlarged Salem network arrowheads

- **Agent:** opencode / kimi-k3.1-pro
- **Intent:** Make arrowheads on the network links easier to see.
- **Code:** `src/lib/stories/salem-witches/components/ScrollyPlot.svelte` increases all three SVG markers from 6 to 8 screen units while retaining zoom compensation.
- **Why:** A modest uniform size increase improves visibility without changing link geometry or marker proportions.
- **Verified:** `npm run check` passes with 0 errors and 7 pre-existing warnings.
- **Open:** None for this change.
- **Git:** `main` @ `b194f56`; unrelated working-tree changes remain.

## 2026-10-27 09:15 — Raised Salem self-loop rings above sprites

- **Agent:** opencode / kimi-k3.1-pro
- **Intent:** Keep the red self-loop circles visible on top of node sprites in the network graph.
- **Code:** `src/lib/stories/salem-witches/components/ScrollyPlot.svelte` renders the self-loop group after the node group.
- **Why:** SVG paint order put the rings behind subsequently rendered sprites; moving the group fixes the layering without changing geometry or styling.
- **Verified:** `npm run check` passes with 0 errors and 7 pre-existing warnings.
- **Open:** None for this change.
- **Git:** `main` @ `b194f56`; unrelated Salem copy and image changes were already uncommitted.
