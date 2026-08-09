# Sylo — Judge-Proof QA Audit

**Goal:** Run through this on the LIVE deployed URL in incognito. Not localhost. The actual URL a judge will open. Every FAIL is a fix-before-submit blocker.

---

## CRITICAL: Environment Check (Do This First)

Open your deployed URL and open browser DevTools → Console.

- [ ] Page loads without any red console errors
- [ ] Try generating a fresh roadmap (step 3 below) — if you get "isn't available without an API key", your deployed environment is missing `ANTHROPIC_API_KEY`. **Stop and fix this before continuing.**

---

## 1. First Impressions (What a Judge Sees in 10 Seconds)

- [ ] Homepage loads instantly (< 2s), no blank white flash
- [ ] "Try an instant demo" dropdown is visible without scrolling on desktop
- [ ] Clicking a demo persona loads the dashboard in < 2s
- [ ] No broken images, missing fonts, or layout jank on first load

---

## 2. Demo Personas (The Exact Paths You'll Show)

### Maya · CS Freshman @ Georgia Tech → Software Engineer

- [ ] Dashboard loads with gap analysis section
- [ ] "Your highest-leverage next move" card shows PURA Salary Award
- [ ] Deadline pill shows urgency color (amber or red depending on date)
- [ ] CascadePanel on hero shows Upstream / Unlocks / Window rows with real text (not empty, not "undefined")
- [ ] 6 steps render below with names, timeframes, status
- [ ] Click the "Opens doors to..." toggle on step 2 or 3 — it expands showing Builds on / Opens / Timing
- [ ] Collapse it again — no glitch
- [ ] Click PURA step name → navigates to opportunity detail page
- [ ] Detail page shows: real program name, requirements list, deadline, link
- [ ] "Open program page" button → opens `undergradresearch.gatech.edu` (real page, not 404)
- [ ] Back button returns to dashboard with state intact

### Alex · Biology Freshman @ UCLA → Physician-Scientist

- [ ] Dashboard loads with steps showing UCLA-specific programs
- [ ] Dependency chain toggles work on the non-hero steps (BISEP, MCDB, etc.)
- [ ] "Opens" text shows real content like "Faculty mentor relationship" not empty
- [ ] External links on detail pages resolve to real UCLA pages

### Fresh NYU Generation (Sophomore, Economics, NYU, Investment Banking)

- [ ] Navigate to `/roadmap-builder`, fill in the fields, click Build
- [ ] Loading state shows with progress labels (not frozen, not instant-empty)
- [ ] Dashboard appears with real IB programs (Goldman Possibilities, SEO, etc.)
- [ ] Steps have deadlines, links, and "Opens doors to" panels
- [ ] If this FAILS with an API error → your keys aren't deployed. Fix immediately.

---

## 3. User Interactions (Things a Judge Will Click)

- [ ] Check a step complete → checkbox fills, confetti fires, status changes
- [ ] Uncheck it → reverts cleanly
- [ ] Drag a step to a new position → it moves, step numbers update
- [ ] Drag it back → no console error, state is clean
- [ ] Click "Ask Sylo for more opportunities" → panel opens
- [ ] Type "scholarship" → results appear from curated DB
- [ ] Click "Add" on a result → it appears in the roadmap
- [ ] Scroll to "Your additions" → "Add a step" button works
- [ ] Type a title and note → click Add → appears in the list
- [ ] Edit a custom step (pencil icon) → fields are editable → click Done
- [ ] Delete a custom step (trash icon) → it disappears

---

## 4. Link Extractor (High Risk — Test This)

- [ ] In "Your additions", click "Add a step"
- [ ] Paste this URL: `https://undergradresearch.gatech.edu/pura-salary`
- [ ] Click Extract → loading spinner appears
- [ ] Either: SUCCESS — preview card shows program name, description, deadline → click "Add to my steps"
- [ ] Or: GRACEFUL FAILURE — amber error message appears + "Add it manually instead" button works
- [ ] **Neither outcome should be a blank screen, console error, or infinite spinner**
- [ ] Try a broken URL like `https://thisisnotareal.site/program` → should show error, not crash

---

## 5. Pages That Must Not 404

- [ ] `/` (homepage)
- [ ] `/dashboard` (redirects to builder if no profile — that's fine)
- [ ] `/roadmap-builder`
- [ ] `/opportunities`
- [ ] `/opportunity-details?id=op-gt-urop-pura` (specific opportunity)
- [ ] `/paths` (success stories)
- [ ] `/about`

---

## 6. Mobile (Judge Might Open on Phone)

Open the deployed URL on a phone or use Chrome DevTools mobile emulator (iPhone 14 / 390px width):

- [ ] Homepage is usable — demo dropdown works on tap
- [ ] Dashboard scrolls vertically, no horizontal overflow
- [ ] Steps are readable, checkboxes are tappable
- [ ] Dependency chain toggle is tappable and expands correctly
- [ ] "Add a step" form is usable on mobile

---

## 7. State Persistence (Judge Might Refresh)

- [ ] Load a demo persona → refresh the page → dashboard still shows (not redirected to builder)
- [ ] Check a step complete → refresh → still shows as complete
- [ ] Add a custom step → refresh → still there
- [ ] Reorder steps → refresh → order persists

---

## 8. External Links Spot Check

Open these from the opportunity detail pages and confirm they don't 404:

- [ ] PURA Salary: `https://undergradresearch.gatech.edu/pura-salary`
- [ ] CREATE-X: `https://create-x.gatech.edu/about-us`
- [ ] Goldman Possibilities: `https://www.goldmansachs.com/careers/students/programs-and-internships/americas/possibilities-series`
- [ ] SEO Career: `https://www.seo-usa.org/career/`
- [ ] UCLA URFP: `https://sciences.ugresearch.ucla.edu/programs-and-scholarships/research-programs/`

---

## 9. Things That Would Embarrass You

- [ ] No "lorem ipsum" or placeholder text anywhere visible
- [ ] No "TODO" or "FIXME" comments rendered in the UI
- [ ] No debug `console.log` output in production console
- [ ] No "undefined" or "null" rendered as visible text on any page
- [ ] No broken/missing icons (all Lucide icons render)
- [ ] Deadline pills don't show weird dates (no "1970" or "Invalid Date")
- [ ] The "Something else" track doesn't show an empty dashboard with no explanation

---

## Sign-off

| Tested on | URL | Date | Result |
|-----------|-----|------|--------|
| Desktop Chrome | | | __/9 sections PASS |
| Mobile (real device or emulator) | | | __/9 sections PASS |

**If section 2 (Demo Personas) or section 4 (Link Extractor) fails → do not submit until fixed.**
