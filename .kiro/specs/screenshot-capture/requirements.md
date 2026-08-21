# Requirements Document

## Introduction

Students screenshot everything — internship posts, class deadlines, financial aid forms, event flyers, professor emails, housing info, notes-to-self — but those captures sit buried in camera rolls, never acted on. **Catch** is Sylo's screenshot inbox: a general life-organization layer where students dump messy screenshots and Sylo automatically reads, categorizes by topic, and files them. Anything that looks like a real opportunity or deadline is offered as a roadmap step using the existing custom-step pipeline, but Catch is intentionally broader than career — it handles housing, finances, class admin, campus life, and personal notes.

Sylo already turns "what matters" into "what to do next." Catch extends that one layer earlier — it turns "everything you screenshotted and forgot about" into "the pieces sorted into your plan."

## Glossary

- **Catch_Item**: A single uploaded screenshot image along with its extracted metadata (id, title, extractedText, topic, tags, detectedDate, isOpportunityLike, opportunityDetails, linkedStepId, createdAt, imageThumbnailBase64).
- **Catch_Store**: The client-side persistence layer (React Context + localStorage) that stores all Catch_Items. Follows the same provider/hook pattern as `WayfindProvider`/`useWayfind()`.
- **Extraction_Service**: The server function (`extractCatchItem.functions.ts`) that sends a screenshot to Claude vision and returns structured metadata in a single call.
- **Topic**: An open-ended, LLM-assigned string label used to group related Catch_Items (e.g. "Financial Aid," "Class Deadlines," "Housing," "Career & Internships," "Campus Life," "Notes to Self"). Topics are not fixed enums.
- **Screenshot_Uploader**: The UI component handling file selection, drag-and-drop, clipboard paste, and batch upload of images on the `/catch` route.
- **Catch_Page**: The route at `/catch` showing the upload zone, topic-grouped items, and search.
- **Dashboard_Indicator**: A small dismissible surface on `/dashboard` that shows how many Catch_Items look like opportunities.
- **Roadmap_Step**: A custom step added to the student's roadmap via the existing `addCustomStep` mechanism.

## Requirements

### Requirement 1: Image Upload and Validation

**User Story:** As a student, I want to upload screenshots via drag-and-drop, file picker, or clipboard paste, so that I can capture life content as fast as I encounter it.

#### Acceptance Criteria

1. THE Screenshot_Uploader SHALL accept images in PNG, JPEG, and WebP formats, rejecting all other file types with an error message stating the accepted formats.
2. THE Screenshot_Uploader SHALL reject any single image file larger than 8 MB and display an error message indicating the maximum allowed size.
3. WHEN a student drags one or more image files onto the upload area, THE Screenshot_Uploader SHALL accept all valid files and begin processing each one independently.
4. WHEN a student pastes an image from the clipboard (Cmd+V or Ctrl+V), THE Screenshot_Uploader SHALL capture the pasted image and begin processing it without requiring additional confirmation.
5. WHEN a student selects multiple files via the file picker, THE Screenshot_Uploader SHALL accept all valid files in the selection and process them as a batch.
6. IF a file in a batch upload is invalid (wrong format or over size limit), THEN THE Screenshot_Uploader SHALL reject only that file with an error message while continuing to process all valid files in the batch.
7. THE Screenshot_Uploader SHALL display a per-image progress indicator during processing so that the student can see which images are complete and which are still extracting.

---

### Requirement 2: Vision-Based Extraction

**User Story:** As a student, I want my screenshots automatically analyzed to pull out key details and categorize the content, so that I don't have to manually type or sort what's in each image.

#### Acceptance Criteria

1. WHEN a valid image is uploaded, THE Extraction_Service SHALL send the image (as base64 with mediaType and filename) to the Claude vision API and return structured metadata.
2. THE Extraction_Service SHALL extract the following fields from each image in a single vision call: a short title, the full OCR'd text content, an open-ended topic label, two to four tags, and any detected date in YYYY-MM-DD format.
3. THE Extraction_Service SHALL determine whether the image content represents a potential opportunity (isOpportunityLike boolean) and, if true, SHALL additionally return full ProgramDetailsSchema fields (name, deadline, requirements, description, category, timeframe, contact).
4. WHEN no date or deadline is detected in the image content, THE Extraction_Service SHALL return the detectedDate field as undefined.
5. IF the Claude API returns an error or times out, THEN THE Extraction_Service SHALL return a structured error object with an error string field and SHALL NOT throw an exception.
6. THE Extraction_Service SHALL assign open-ended topic labels based on image content rather than selecting from a fixed enum, allowing labels such as "Financial Aid," "Class Deadlines," "Housing," "Career & Internships," "Campus Life," "Notes to Self," or any other label that fits.
7. THE Extraction_Service SHALL not send any student data beyond the image itself and the extraction prompt to the Claude API.

---

### Requirement 3: Client-Side Persistence

**User Story:** As a student, I want my captured screenshots and extracted data saved locally on my device, so that I can access them without creating an account and they persist across sessions.

#### Acceptance Criteria

1. THE Catch_Store SHALL persist all Catch_Item metadata and thumbnail data in localStorage, following the same React Context provider pattern as `WayfindProvider`/`useWayfind()`.
2. THE Catch_Store SHALL be implemented as a separate `CatchProvider` component and `useCatch()` hook in its own file.
3. WHEN a Catch_Item is saved, THE Catch_Store SHALL assign it a unique identifier and a createdAt ISO timestamp.
4. THE Catch_Store SHALL store a compressed thumbnail (minimal size, capped per item) of each uploaded image as base64 in the imageThumbnailBase64 field.
5. WHEN the student opens the app, THE Catch_Store SHALL hydrate state from localStorage without any network request.
6. THE Catch_Store SHALL expose methods to add, update, and delete Catch_Items.
7. THE Catch_Store SHALL expose a method to update the linkedStepId field when a Catch_Item is connected to a roadmap step.

---

### Requirement 4: Topic Organization

**User Story:** As a student, I want my screenshots automatically sorted into topic groups, so that I can find things later without manually filing every upload.

#### Acceptance Criteria

1. WHEN the Extraction_Service returns a topic label for a Catch_Item, THE Catch_Store SHALL file the Catch_Item under that topic automatically.
2. THE Catch_Page SHALL display Catch_Items grouped by topic in collapsible sections, with the most recently active topic appearing first.
3. WHEN a topic does not yet exist in the Catch_Store, THE Catch_Store SHALL create it upon receiving the first Catch_Item with that topic label.
4. WHEN a student manually reassigns a Catch_Item to a different topic (either an existing topic or a new user-typed topic), THE Catch_Store SHALL update that Catch_Item's topic field.
5. THE Catch_Page SHALL support manual topic reassignment via drag-and-drop to a different topic section or by typing a new topic name in the item's detail view.
6. THE Catch_Page SHALL display each topic section with the count of items it contains.

---

### Requirement 5: Deadline Surfacing

**User Story:** As a student, I want items with detected dates flagged visually — especially near-future ones — so that I never miss a deadline buried in a screenshot.

#### Acceptance Criteria

1. WHEN a Catch_Item has a detectedDate value, THE Catch_Page SHALL display a deadline indicator on that item using the same visual pattern as the existing DeadlinePill component.
2. WHEN a Catch_Item's detectedDate is within 7 days from today, THE Catch_Page SHALL highlight it with an urgent visual indicator distinguishable from further-out dates.
3. WHEN a Catch_Item's detectedDate is in the past, THE Catch_Page SHALL display it with a visually distinct "Passed" style.
4. THE Catch_Page SHALL display items with near-future detectedDate values prominently within their topic group (sorted toward the top or given visual emphasis).

---

### Requirement 6: Search

**User Story:** As a student, I want to search across all my captured screenshots' text, titles, and tags, so that I can find a specific item even if I don't remember which topic it's in.

#### Acceptance Criteria

1. WHEN a student enters a search query on the Catch_Page, THE Search function SHALL perform a case-insensitive match against the extractedText, title, and tags of all Catch_Items in the Catch_Store.
2. THE Search function SHALL return results within 200 ms for a store containing up to 200 Catch_Items.
3. THE Search function SHALL display results as a list of matching Catch_Items showing title, topic, tags, and a snippet of extracted text containing the match.
4. WHEN no Catch_Items match the search query, THE Search function SHALL display an empty state message.
5. THE Search function SHALL be accessible from the Catch_Page header area without navigating to a separate view.

---

### Requirement 7: Single Item View

**User Story:** As a student, I want to view a screenshot's full details and edit its metadata, so that I can correct the AI's categorization or act on the information.

#### Acceptance Criteria

1. THE Single_Item_View SHALL display the image thumbnail of the Catch_Item.
2. THE Single_Item_View SHALL display the extractedText, title, tags, topic, and detectedDate as editable fields.
3. WHEN a student edits the title, tags, or topic in the Single_Item_View, THE Catch_Store SHALL persist the changes immediately.
4. THE Single_Item_View SHALL provide a "Delete" action that removes the Catch_Item from the Catch_Store after the student confirms the deletion.
5. THE Single_Item_View SHALL provide a "Download" action that saves the image thumbnail to the student's device.
6. WHEN the Catch_Item has isOpportunityLike set to true and linkedStepId is not set, THE Single_Item_View SHALL display an "Add to roadmap" button.

---

### Requirement 8: Roadmap Integration

**User Story:** As a student, I want to turn opportunity-like screenshots into roadmap steps with one tap, so that Catch connects directly to my plan.

#### Acceptance Criteria

1. WHEN a Catch_Item has isOpportunityLike set to true and linkedStepId is not set, THE Catch_Page SHALL display an "Add to roadmap" button on that item.
2. WHEN the student taps "Add to roadmap," THE Catch_Page SHALL call the existing `addCustomStep` handler to create a new custom step on the roadmap using the opportunityDetails from the Catch_Item.
3. WHEN a custom step is successfully created from a Catch_Item, THE Catch_Store SHALL set the linkedStepId field on that Catch_Item to the new step's identifier.
4. WHEN a Catch_Item has a linkedStepId set, THE Catch_Page SHALL display "Added to roadmap" in place of the "Add to roadmap" button.
5. THE Catch_Page SHALL visually distinguish opportunity-like items from other Catch_Items using a badge or accent indicator.

---

### Requirement 9: Dashboard Tie-In

**User Story:** As a student, I want a subtle indicator on my dashboard showing how many Catch items look like opportunities, so that I'm reminded to review and act on them.

#### Acceptance Criteria

1. THE Dashboard_Indicator SHALL appear on the `/dashboard` route as a small, single-line dismissible surface (not a full panel).
2. THE Dashboard_Indicator SHALL display the count of Catch_Items where isOpportunityLike is true and linkedStepId is not set.
3. THE Dashboard_Indicator SHALL include a link that navigates to the `/catch` route.
4. WHEN the student dismisses the Dashboard_Indicator, THE Dashboard_Indicator SHALL remain hidden for the current session.
5. WHEN the count of unlinked opportunity-like Catch_Items is zero, THE Dashboard_Indicator SHALL not be displayed.

---

### Requirement 10: Navigation

**User Story:** As a student, I want to access Catch from the main navigation sidebar, so that the feature is discoverable alongside my other tools.

#### Acceptance Criteria

1. THE application SHALL add a new entry to the NAV array in workspace.tsx: `{ to: "/catch", label: "Catch", icon: Inbox }` positioned after the "Roadmap" entry.
2. THE application SHALL render the Catch_Page at the `/catch` route using the same Workspace layout component as other pages.
3. THE Catch_Page SHALL include the Screenshot_Uploader as a persistent upload zone at the top of the page.
4. WHEN the Catch_Store contains zero Catch_Items, THE Catch_Page SHALL display an empty state with instructions on how to upload a first screenshot and a prominent upload action.
5. THE application SHALL not modify the `opportunities-db.ts` file, the `opportunities-db.json` data file, `src/routes/paths.tsx`, `success-map-form.tsx`, or `published-maps.ts` as part of this feature.
