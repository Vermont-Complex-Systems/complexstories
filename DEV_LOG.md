# Dev Log

Project memory for agents. Newest entry first. One entry per work session or checkpoint.

<!-- dev-log:entries -->

## 2026-11-16 — Labeled stress comparison groups

- **Intent:** Make the male reference label smaller and identify the non-male range directly.
- **Code:** Added a matching, theme-colored label above the estimated range.
- **Verified:** Svelte autofixer reported no issues; `npm run check` passed with 6 existing warnings; story JSON and label validated.
- **Open:** Browser layout review not run; `git diff --check` reports trailing whitespace on a separate edited copy line.

## 2026-11-16 — Simplified stress chart labels

- **Intent:** Place the male reference label next to its dot and remove duplicated chart text.
- **Code:** Moved the reference label above the dot; the callout names both comparison groups.
- **Verified:** Svelte autofixer reported no issues; `npm run check` passed with 6 existing warnings.
- **Open:** Browser layout review not run.

## 2026-11-16 — Mark the stress comparison reference

- **Intent:** Make the male reference visible without suggesting a stress score of zero.
- **Code:** Added a reference dot, removed the zero label, and marked the axis in points above the reference.
- **Verified:** Browser inspection confirmed the reference dot and 1+ through 4+ labels; Svelte autofixer reported no issues, and `npm run check` passed with 6 existing warnings.
- **Open:** None.

## 2026-11-16 — Show the stress-score difference

- **Intent:** Emphasize the estimated difference in perceived stress rather than the gender makeup of the cohort.
- **Code:** Replaced the second stress step's student grid with the range of gender coefficients from the five models in the stress paper's Table 2, using male students as the reference.
- **Copy:** Identified the range as model estimates rather than a confidence interval and described model adjustments.
- **Verified:** Checked Table 2 endpoints, Svelte diagnostics, and the rendered chart at desktop and mobile widths.
- **Open:** None.

## 2026-11-16 — Distinguished stress responses from students

- **Finding:** The 64% is 1,996 of 3,112 survey responses; the 73% is 381 of 525 students, not a breakdown of the above-threshold responses.
- **Copy:** Replaced the response dot grid with a stacked bar and clarified that the following gender breakdown describes students in the cohort.
- **Verified:** The stress paper reports the response count in Results and the gender counts in Table 1.
- **Verified:** Checked counts and the rendered response bar at mobile width.
- **Open:** None.

## 2026-11-16 — Simplified the panic-attack step

- **Intent:** Connect the 38% visual to its cohort count without mixing in findings from smaller analysis samples.
- **Copy:** Kept the existing visual, clarified its reporting labels, and replaced the step text and diagnostic-group extras with a brief description of the 182-person analysis.
- **Verified:** The panic paper's methods and Figure 1 describe the 525, 197, and 182-person samples.
- **Open:** None.

## 2026-11-16 — Compare prior diagnosis with stacked bars

- **Intent:** Make the anxiety-diagnosis comparison read as two within-group rates rather than dot grids.
- **Code:** `UnitChart.svelte` renders separate 100%-stacked rows with sample sizes and visible counts/percentages; `gad-priors` now explains the bar encoding.
- **Verified:** Svelte autofixer reported no issues; JSON syntax validated.
- **Open:** Browser layout review not run.

## 2026-11-16 — Render Markdown in lemurs step descriptions

- **Intent:** Make inline Markdown formatting in step descriptions, including bold text, render correctly.
- **Code:** `components/Chapter.svelte` now renders each description with scrolly-kit’s `MarkdownRenderer`.
- **Verified:** `npm run check` reports 0 errors and 6 warnings; Svelte autofixer reports no issues.
- **Open:** None.

## 2026-11-16 — Verified the heart-rate arc source

- **Source:** PubMed PMID 39015512 links to the open-access PMC article and its PDF: *The Two Fundamental Shapes of Sleep Heart Rate Dynamics and Their Connection to Mental Health in College Students*.
- **Copy:** Clarified that the 33.6% and 66.0% trough times are per-night medians, distinguished them from the displayed centroid curves, and changed “identical” sleep duration to “no significant difference.”
- **Verified:** The article reports stable k=2 clusters, 20,167 periods from 599 participants, and the 36%/64% split.
- **Open:** The PMC PDF is available online; it was not copied into the repository.

## 2026-11-16 — Checked the newly added sleep paper

- **Finding:** `papers/fudolig-arc-of-sleep.pdf` is the 2025 *npj Complexity* article on collective sleep and activity, not the 2024 *Digital Biomarkers* article cited for the heart-rate arcs. It cites the latter as reference 47.
- **Verified:** The 2025 paper focuses on sleep timing and activity; it does not report the heart-rate clusters, 20,167-night sample, or arc statistics.
- **Open:** Obtain *The two fundamental shapes of sleep heart rate dynamics and their connection to mental health in college students* (Digital Biomarkers 8:120–131, 2024) before validating the arc claims.

## 2026-11-16 — Clarified lemurs visual claims

- **Intent:** Apply fact-check wording updates without settling unresolved source conflicts.
- **Copy:** Labeled threshold motion as simulated; reframed activity as aggregate synchrony; clarified panic, stress-response, sleep-average, and separate nature-exposure figures; softened causal language.
- **Verified:** JSON syntax and requested-content checks passed.
- **Open:** Nature chart provenance and the source manuscripts' conflicting anxiety figures remain unresolved.

## 2026-11-16 — Fact-checked the lemurs story

- **Intent:** Compare the story's claims and visualizations with the five supplied papers.
- **Verified:** Reviewed the paper text, story copy, visualization provenance, and reconstructed sleep-window data; checked the reported counts and percentages.
- **Open:** Resolve conflicting anxiety and nature results with the authors; obtain missing visualization sources and correct or clearly label reconstructed data before publication.

## 2026-11-16 — Illustrated the introduction

- **Intent:** Place `sensing.png` to the right of the introduction text.
- **Code:** `components/Index.svelte` displays the illustration in a two-column introduction, stacking below the text on small screens.
- **Verified:** `npm run check` reports 0 errors and 6 existing warnings; `git diff --check` passes.
- **Open:** Browser layout review not run.

## 2026-11-16 — Added introduction and conclusion placeholders

- **Intent:** Make room for prose before and after the lemurs scrolly.
- **Code:** `components/Index.svelte` renders introductory and concluding sections around the chapters; `data/copy.json` holds editable Markdown placeholders.
- **Verified:** Checked the placeholder content and section ordering; Svelte autofixer reported no issues in the changed markup snippet.
- **Open:** Replace both placeholders with story text. Browser review not run; `npm run check` was previously denied.

## 2026-11-16 — Lightened the closing threshold tint

- **Intent:** Make the moving "above it some weeks" group lighter orange.
- **Code:** Updated the story's stress tint in light and dark themes; the closing step is its only current user.
- **Verified:** Checked that both tints are orange and lighter than the main hue; Svelte autofixer reported no issues in the changed style snippet.
- **Open:** Browser review not run; `npm run check` was previously denied.

## 2026-11-16 — Reused anxiety threshold visualization in closing

- **Intent:** Show the closing cohort crossing the anxiety threshold as in the earlier persistence step.
- **Data:** Enabled threshold motion for the closing step and matched its three groups to the persistence step; corrected its headline to 8% above threshold at every survey.
- **Verified:** A JSON assertion confirms both steps have identical group data, threshold motion, and headline percentage.
- **Open:** Browser review not run; `npm run check` was previously denied.

## 2026-11-16 — Corrected anxiety persistence percentage

- **Intent:** Make the headline match the legend and the recorded 43 of 541 students.
- **Data:** Changed the `gad-persistence` headline from 9% to 8%; the prior-diagnosis comparison remains unchanged for investigation.
- **Verified:** The displayed 8% matches the existing group share of 0.08.
- **Open:** The manuscript's reported 9% and the prior-diagnosis comparison need investigation.

## 2026-11-16 — Animated sleep visualizations

- **Intent:** Draw in the sleep-window rings and the first hammock heart-rate arc as their steps appear.
- **Code:** `SleepWindows.svelte` has an opt-in radial entrance animation enabled in `Chapter.svelte`. `SleepSignals.svelte` uses global entrance transitions so the first arc animates when its chart appears; both respect reduced-motion preferences.
- **Verified:** Svelte autofixer found no issues in the changed component snippets.
- **Open:** `npm run check` and browser verification were not run because command permission was denied.

## 2026-11-16 — Removed sleep timing step

- **Intent:** Remove the step comparing falling-asleep and getting-up times.
- **Data:** Removed the `alarm-minutes` step from the lemurs story copy; other Sleep steps remain.
- **Verified:** Validation commands were not run because permission was denied.
- **Open:** Run `npm run check` when permitted.

## 2026-11-16 — Added lemurs chapter illustrations

- **Intent:** Show the matching illustration in each chapter header.
- **Code:** `components/Index.svelte` pairs Sleep, Nature, Activity, Anxiety and Stress with their namesake PNGs and places them beside the header text.
- **Verified:** All five matching PNGs load and fit beside their titles at 1440px and 390px viewport widths. `npm run check` reports 0 errors and 6 existing warnings.
- **Open:** None.

## 2026-11-16 — Resized lemurs images

- **Intent:** Reduce image file sizes while retaining PNG filenames and proportions.
- **Data:** Resized all 11 images in `src/lib/stories/lemurs/data/images/` from 5400 × 5400 to 2000 × 2000 pixels.
- **Verified:** All 11 images decode as PNG; the directory is 22 MB, down from approximately 169 MB. `npm run check` reports 0 errors and 6 existing warnings.
- **Open:** None.

## 2026-11-09 — Lemurs: animate the crowd into the impairment grid

- **Intent:** Make the opening social crowd visibly resolve into the “35% arrived impaired” dot grid instead of disappearing before its dots can arrive.
- **Code:** `SocialField.svelte` maps each moving dot to its impairment-grid position. `UnitChart.svelte` keeps the crowd visible for the one-second movement, then fades it as the chart fades in; reduced-motion behavior remains static.
- **Verified:** `npm run check` reports 0 errors; `git diff --check` passes.
- **Open:** Browser visual review of the handoff has not been run.

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

## 2026-11-16 13:50 — Drafted story-corps copy

- **Agent:** Copilot
- **Intent:** Populate `story-corps` copy from the outline and the two papers.
- **Code:** `src/lib/stories/story-corps/data/copy.json` now has 17 steps covering micro/macro/super, speech-rate centiles, accommodation, dialog acts, and the memory-loss allotaxonographs.
- **Why:** Follows the outline; claims are taken from the papers.
- **Verified:** JSON parses. `ScrollyPlot.svelte` is still the template bar chart.
- **Open:** Pick the 2-3 deviating features (step 8 is generic); n-gram step is a TODO; no figures built yet.
