# Requirements Document: Success Map Publishing

## Introduction

Sylo's "Success Maps" tab currently displays curated, pre-written career paths that show students how real people reached specific career outcomes. This feature extends Success Maps to allow students who have completed their own roadmap to **publish their path** — the specific steps, timing, decisions, and advice — so future students on the same track can see what actually worked.

The publishing flow is structured and prompted (not free-form) to ensure every published map is scannable, useful, and honest. Submissions go through a light review before appearing publicly. A composite example map is provided to set the quality bar.

This is a $0/use feature: no AI calls, no external APIs. Pure client-side form → storage → display.

## Glossary

- **Success_Map**: A published, structured account of how a student went from their starting point to a career outcome, including the steps they took, timing, and advice.
- **Submission_Form**: The structured prompt flow that guides a student through publishing their path.
- **Composite_Example**: A clearly-labeled example Success Map based on real experiences but using a fictional identity, used to set quality expectations.
- **Decision_Log**: The section of a Success Map where the author explains their key turning points and what they'd skip.
- **Step_Entry**: A single action within the path, with timing (year/semester), what they did, and optionally what it unlocked.
- **Review_Queue**: The moderation layer where submitted maps land before being published publicly.

## Requirements

### Requirement 1: Structured Submission Form

**User Story:** As a student who reached my career goal, I want a guided form that prompts me for the right information, so that I can share my path without having to figure out what to write.

#### Acceptance Criteria

1. THE Submission_Form SHALL collect the following fields in order: starting point (major, year, school), career goal reached (role + company/type), timeline (when they started → when they landed the goal), steps taken (ordered list of Step_Entries), turning point (single paragraph: the one thing that mattered most), what they'd skip (single paragraph), and one piece of advice for someone at step 1.
2. EACH Step_Entry SHALL require: timing (semester + year, e.g., "Fall Sophomore"), what they did (one sentence), and category (one of: internship, fellowship, club, project, networking, application, course, other).
3. THE Submission_Form SHALL allow a minimum of 3 and maximum of 12 Step_Entries.
4. THE Submission_Form SHALL allow the author to optionally include: their first name (or alias), whether they want to be anonymous, and a link to their LinkedIn (not displayed publicly, used for verification only).
5. THE Submission_Form SHALL validate that all required fields are non-empty and that at least 3 Step_Entries have been provided before allowing submission.
6. THE Submission_Form SHALL show a preview of the final published card before the user confirms submission.
7. THE Submission_Form SHALL be accessible from the Success Maps tab via a CTA: "Have a path that worked? Share it so others can see."

---

### Requirement 2: Published Success Map Display

**User Story:** As a student browsing Success Maps, I want each published map to be scannable and consistently formatted, so that I can quickly understand someone's path without reading a wall of text.

#### Acceptance Criteria

1. EACH published Success_Map SHALL display: the author's starting point (major, year, school), the outcome they reached, a visual timeline of Step_Entries (ordered, with timing labels), the turning point highlight, and the "what I'd skip" section.
2. THE timeline visualization SHALL display Step_Entries as a vertical sequence with timing on the left and action on the right, using category-colored indicators (same colors as opportunity categories).
3. THE "Turning point" section SHALL be visually emphasized (highlighted background, distinct typography) to draw attention to the most important insight.
4. PUBLISHED Success_Maps SHALL display the author's first name or "Anonymous" if they chose anonymity, but SHALL NOT display email, LinkedIn, or any identifying information beyond what the author explicitly provided.
5. PUBLISHED Success_Maps SHALL display a "Track" badge matching the career track so students can filter by their own goal.
6. THE Success Maps tab SHALL allow filtering published maps by track (career goal) and optionally by school.

---

### Requirement 3: Composite Example Map

**User Story:** As a first-time visitor to Success Maps, I want to see a high-quality example of what a published path looks like, so I understand what's expected before I submit my own.

#### Acceptance Criteria

1. THE Success Maps tab SHALL include at least one Composite_Example that is clearly labeled: "Example path — based on real experiences, composite identity."
2. THE Composite_Example SHALL follow the exact same visual format as user-submitted maps, demonstrating the expected quality and level of detail.
3. THE Composite_Example SHALL cover a common career track (Product Manager or Software Engineer) and include 5-8 realistic Step_Entries with accurate timing.
4. THE Composite_Example SHALL include a realistic "Turning point" and "What I'd skip" section that demonstrates the kind of honest, specific insight expected from submitters.
5. THE Composite_Example SHALL appear at the top of the Success Maps list when no filters are active, with a subtle "Example" badge distinguishing it from real submissions.

---

### Requirement 4: Review and Moderation

**User Story:** As a product operator, I want submitted maps to go through review before publishing, so that low-effort, inappropriate, or misleading content never reaches other students.

#### Acceptance Criteria

1. WHEN a student submits a Success_Map, THE system SHALL store it in a Review_Queue rather than publishing it immediately.
2. THE Review_Queue SHALL be accessible to administrators (initially just the product operator) via a simple interface showing pending submissions with all fields visible.
3. AN administrator SHALL be able to: approve (publishes immediately), reject (deletes with optional reason), or edit (modify text for clarity/brevity before publishing) a submission.
4. WHEN a submission is approved, THE Success_Map SHALL appear on the public Success Maps tab within the current session (no page refresh required for the approver).
5. THE system SHALL NOT notify the submitter of rejection (to avoid gaming). Approved maps simply appear; rejected ones silently disappear.
6. UNTIL a backend/database is available, THE Review_Queue MAY be implemented as a simple localStorage-based holding area (for demo purposes) or a serverless form submission (for production).

---

### Requirement 5: CTA and Discovery

**User Story:** As a student who completed their roadmap, I want to be prompted to share my path at the right moment, so that publishing feels natural and not forced.

#### Acceptance Criteria

1. WHEN a student marks all roadmap steps as "complete" (or marks their top opportunity as complete), THE dashboard SHALL display a one-time, dismissible prompt: "Your roadmap is complete — want to share what worked so others can see?"
2. THE prompt SHALL link directly to the Submission_Form with the student's starting point (major, year, school) and goal pre-filled from their profile.
3. THE Success Maps tab SHALL display a persistent but non-intrusive CTA at the bottom: "Have a path that worked? Share it here." linking to the Submission_Form.
4. THE CTA SHALL NOT appear to students who have not yet built a roadmap (no profile or roadmap in state).
5. IF a student dismisses the dashboard completion prompt, THE system SHALL NOT show it again for that profile.

---

### Requirement 6: Data Storage (MVP)

**User Story:** As a developer, I want a simple storage approach for MVP that works without a backend, so that the feature is usable in demos and early launch without infrastructure dependencies.

#### Acceptance Criteria

1. FOR MVP, published Success_Maps SHALL be stored as a static JSON array bundled with the application (same pattern as the opportunity database), editable by the operator.
2. THE Submission_Form SHALL output the submission as a JSON object matching the published format, allowing the operator to copy-paste approved submissions into the static file.
3. THE published Success_Maps JSON SHALL support a minimum of 50 entries without degradation in load time (< 500ms parse).
4. EACH published Success_Map record SHALL include: id (unique string), author display name or "Anonymous", track, school, outcome (role description), steps (array of Step_Entries), turningPoint (string), wouldSkip (string), advice (string), and publishedAt (ISO date).
5. WHEN a backend becomes available, THE storage layer SHALL be replaceable without changes to the display components (abstracted behind a query function).

---

### Requirement 7: Privacy and Safety

**User Story:** As a student publishing my path, I want control over what's shared publicly, so that I'm not exposing information I'm uncomfortable with.

#### Acceptance Criteria

1. THE Submission_Form SHALL clearly state what will be public (display name, school, major, steps, advice) and what will NOT be public (LinkedIn, email, full name if anonymous chosen).
2. THE Submission_Form SHALL default to "Anonymous" for the display name, requiring an explicit opt-in to show a first name.
3. PUBLISHED Success_Maps SHALL NOT include: GPA, specific company names in the "where they ended up" field unless the author explicitly typed it (no auto-population from profile), or any contact information.
4. THE Success Maps display SHALL NOT include any mechanism for other students to contact the author (no messaging, no email links, no profile links).
5. IF an author later wants their map removed, THE operator SHALL be able to remove it from the static JSON and the map SHALL disappear on next deploy.
