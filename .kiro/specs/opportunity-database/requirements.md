# Requirements Document

## Introduction

Sylo currently relies on a hand-maintained TypeScript file (`wayfind-data.ts`) containing ~25 seed opportunities tied to 5 career tracks. This works for demos but cannot scale: adding a new school, track, or program means editing code. Meanwhile, live search finds real programs at runtime but with lower confidence and no persistence.

The **Opportunity Database** introduces a structured, bundled dataset of curated student opportunities — analogous to how `universities.json` provides a static, searchable list of schools. It serves as the primary source of verified opportunity data that the AI roadmap builder and live search layer draw from, replacing the inline `OPPORTUNITIES` array with a scalable, queryable data layer.

## Glossary

- **Opportunity_Database**: The bundled JSON dataset plus its in-memory query layer that stores and retrieves curated opportunity records.
- **Opportunity_Record**: A single entry in the Opportunity_Database describing a real program, pipeline, fellowship, internship, club, funding source, advising resource, or course.
- **Curator**: An administrator or contributor who adds, edits, or removes Opportunity_Records from the database.
- **Search_Index**: The in-memory structure built at import time that enables fast filtering and prefix-first text search over Opportunity_Records.
- **Track**: A career direction a student is pursuing (physician-scientist, product-manager, software-engineer, investment-banking, research-phd, something-else).
- **Category**: The type of opportunity (Research, Internship, Fellowship, Club, Funding, Advising, Course).
- **Opportunity_Browser**: The UI component that allows students to explore, search, and filter curated opportunities outside the roadmap flow.
- **Confidence_Level**: A field indicating data provenance — "curated" for human-verified entries, "live" for AI-extracted entries, "community" for user-submitted entries pending verification.
- **Roadmap_Engine**: The server function that ranks and sequences opportunities into a personalized student roadmap.

## Requirements

### Requirement 1: Static Bundled Data Format

**User Story:** As a developer, I want opportunities stored in a static JSON file with a well-defined schema, so that the dataset loads without network calls and can be version-controlled.

#### Acceptance Criteria

1. THE Opportunity_Database SHALL store all curated Opportunity_Records in one or more static JSON files (maximum 10 files) bundled with the application at build time.
2. WHEN the application loads, THE Opportunity_Database SHALL be parsed and queryable in memory without any network request or asynchronous initialization, completing within 2 seconds of application start.
3. THE Opportunity_Database SHALL represent each Opportunity_Record using a schema that includes the following fields and types: id (unique string, required), name (string, required, 1–200 characters), track (string, required), category (string, required), access (string, required), school (string, optional), deadline (string in ISO 8601 date format, optional), timeframe (string, optional), requirements (array of strings, optional), contact (string, optional), link (valid URL string, optional), timeline (string, optional), leverage (string, optional), confidence level (string enum of "high", "medium", or "low", required), tags (array of strings, optional, maximum 20 items), and geographic region (string, required).
4. WHEN a new Opportunity_Record is added to the JSON file, THE Opportunity_Database SHALL accept it without code changes to the query layer, provided it contains all required fields with values matching their defined types.
5. IF a record in the JSON file is missing a required field or contains a value that does not match the defined type, THEN THE Opportunity_Database SHALL reject that record at build time or load time and report an error message indicating which field failed validation.
6. FOR ALL valid Opportunity_Records, serializing then deserializing the JSON SHALL produce a record with identical field names and values compared field-by-field to the original (round-trip equivalence).
7. THE Opportunity_Database SHALL support a minimum of 500 Opportunity_Records across all bundled JSON files without degradation of the load-time requirement specified in criterion 2.

---

### Requirement 2: Query and Filter API

**User Story:** As a developer, I want a typed query API over the opportunity dataset, so that the roadmap engine and UI components can retrieve relevant subsets without scanning the entire array manually.

#### Acceptance Criteria

1. THE Search_Index SHALL support filtering Opportunity_Records by any combination of: track, category, school, year-relevance, geographic region, and tags, where omitting a filter field means no constraint is applied for that field.
2. WHEN a text query is provided, THE Search_Index SHALL perform a case-insensitive match and return Opportunity_Records whose name or tag list contains the query as a substring, with results sorted so that prefix matches appear before substring-only matches.
3. WHEN multiple filters are applied simultaneously, THE Search_Index SHALL return only records that satisfy all filter fields (logical AND across fields), and WHERE a filter field accepts multiple values (e.g., multiple tags), records matching any one of the provided values for that field SHALL be included (logical OR within a field).
4. THE Search_Index SHALL cap results at a configurable maximum between 1 and 200 (default 50) and return the results as an array truncated to that limit after sorting is applied.
5. WHEN no filters are provided, THE Search_Index SHALL return records ordered by deadline proximity (soonest first), and records without a deadline SHALL appear after all records that have a deadline.
6. WHEN a query or filter combination matches zero records, THE Search_Index SHALL return an empty array.
7. THE Search_Index SHALL build its internal lookup structures once at module import time, with no per-query allocation of the full dataset.

---

### Requirement 3: School-Specific and Universal Records

**User Story:** As a student, I want to see opportunities that are specific to my school alongside nationally available programs, so that my roadmap reflects what is actually accessible to me.

#### Acceptance Criteria

1. THE Opportunity_Database SHALL support Opportunity_Records scoped to a specific school (by name, case-insensitive match) and records marked as universally available (school = "any").
2. WHEN a student's school is known, THE Search_Index SHALL return both school-specific records matching that school and universal records, with school-specific records ranked above universal records in the result order.
3. WHEN a student's school is not in the database, THE Search_Index SHALL still return universal records and records tagged for the student's geographic region, ranked with region-matched records above general universal records.
4. IF no Opportunity_Records match the student's school or region, THEN THE Search_Index SHALL return only universal records and include a metadata flag indicating that school-specific data is unavailable.
5. THE Opportunity_Database SHALL validate that each school field value is either "any" or a non-empty string matching a known school from the universities dataset.

---

### Requirement 4: Integration with Roadmap Engine

**User Story:** As a student, I want my personalized roadmap to draw from the curated database first and supplement with live search results, so that I get verified information by default and broader coverage when needed.

#### Acceptance Criteria

1. WHEN the Roadmap_Engine generates a roadmap, THE Roadmap_Engine SHALL query the Opportunity_Database for records matching the student's track, school, and year before invoking live search, and SHALL wait no longer than 5 seconds for the Opportunity_Database response.
2. WHEN the Opportunity_Database returns three or more matching records, THE Roadmap_Engine SHALL use exclusively those curated records as the dataset for ranking and sequencing without invoking live search.
3. WHEN the Opportunity_Database returns fewer than three matching records, THE Roadmap_Engine SHALL supplement with up to 10 live search results and assign each live result a confidence level of "live" while assigning curated records a confidence level of "curated".
4. THE Roadmap_Engine SHALL label every record in the output with exactly one confidence level from the set {"curated", "live"} so that no record appears without a source designation.
5. WHEN both curated and live records are present and share the same leverage score, THE Roadmap_Engine SHALL rank curated records above live records in the output order.
6. IF the Opportunity_Database is unavailable or fails to respond within 5 seconds, THEN THE Roadmap_Engine SHALL proceed using only live search results, assign all results a confidence level of "live", and include an indicator that curated data was unavailable.
7. WHEN the Roadmap_Engine queries the Opportunity_Database, THE Roadmap_Engine SHALL consider a record as matching only if the record's track, school, and year fields all equal the student's corresponding profile values.

---

### Requirement 5: Opportunity Browser UI

**User Story:** As a student, I want to browse and search the full opportunity database outside of the roadmap flow, so that I can explore what is available before committing to a career track.

#### Acceptance Criteria

1. THE Opportunity_Browser SHALL display a searchable, filterable list of Opportunity_Records from the Opportunity_Database, showing a minimum of the record name, category, deadline, and confidence level in the list view.
2. WHEN a student types in the search field, THE Opportunity_Browser SHALL debounce input by 150ms and update results within 100ms after the debounce fires.
3. THE Opportunity_Browser SHALL provide filter controls for: track (multi-select), category (multi-select), school (text input with autocomplete from the universities dataset), and deadline window (radio group: upcoming 30 days, 60 days, 90 days, or all).
4. WHEN a student selects an Opportunity_Record, THE Opportunity_Browser SHALL display the full record details including name, deadline, requirements, contact, link, leverage description, confidence level, tags, and last_verified date.
5. THE Opportunity_Browser SHALL visually distinguish curated records from live or community-submitted records using a colored badge ("Curated" in green, "Live" in blue, "Community" in amber).
6. THE Opportunity_Browser SHALL be accessible via the route `/opportunities` and also embeddable as a panel within the roadmap workspace via a shared component export.
7. WHEN filters are active and no records match, THE Opportunity_Browser SHALL display an empty state message indicating no results were found and suggesting filter adjustments.

---

### Requirement 6: Data Integrity and Validation

**User Story:** As a developer, I want the opportunity dataset validated at build time, so that malformed or incomplete records never reach students.

#### Acceptance Criteria

1. WHEN the application builds, THE Opportunity_Database SHALL validate every record against the defined schema and fail the build with a non-zero exit code if any record is invalid.
2. IF a record is missing any required field (id, name, track, category, school, deadline, link, or leverage) or any required field contains an empty string, THEN THE Opportunity_Database SHALL fail the build and report an error message indicating the record identifier and the name of the missing or empty field.
3. IF any two records share the same id value, THEN THE Opportunity_Database SHALL fail the build and report an error message indicating the duplicated id.
4. IF a record contains a track value not present in the defined Track enum, THEN THE Opportunity_Database SHALL fail the build and report an error message indicating the record identifier and the invalid track value.
5. IF a record contains a category value not present in the defined Category enum, THEN THE Opportunity_Database SHALL fail the build and report an error message indicating the record identifier and the invalid category value.
6. IF a record contains a deadline field, THEN THE Opportunity_Database SHALL validate that its value is either an empty string or a valid date in ISO 8601 format (YYYY-MM-DD), and SHALL fail the build if the value matches neither format.
7. IF a record contains a link field value, THEN THE Opportunity_Database SHALL validate that it begins with "http://" or "https://" and fail the build if it does not.

---

### Requirement 7: Extensibility and Contribution Model

**User Story:** As a curator, I want a clear process to add new opportunities to the database, so that the dataset grows over time without requiring deep code knowledge.

#### Acceptance Criteria

1. THE Opportunity_Database SHALL store records in JSON format that can be edited with any text editor and validated independently of the application runtime using a standalone CLI command or script.
2. THE Opportunity_Database SHALL support organizing records into separate files by track or region (one file per track or region), merged at build time into a single queryable dataset with deduplication by record id.
3. WHEN a new record is contributed, THE Opportunity_Database SHALL require the contributor to provide at minimum: name, track, category, school, link, and a one-sentence leverage description (minimum 10 characters).
4. THE Opportunity_Database SHALL include a schema definition file (Zod schema exported from a TypeScript module) that external tools can import and use to validate contributions before submission.
5. WHEN the dataset exceeds 500 records, THE Opportunity_Database SHALL maintain sub-200ms cold-start parse time on a standard client device by using a flat array structure rather than nested objects.

---

### Requirement 8: Backward Compatibility with Seed Data

**User Story:** As a developer, I want the new database to subsume the existing `wayfind-data.ts` opportunity array, so that there is one source of truth and no drift between two datasets.

#### Acceptance Criteria

1. THE Opportunity_Database SHALL contain all Opportunity_Records currently defined in the `OPPORTUNITIES` array of `wayfind-data.ts`, preserving every field value for each record with no omissions or transformations, such that the record count and per-field values in the database match the source array exactly.
2. WHEN the Opportunity_Database is active, THE Roadmap_Engine SHALL read opportunities from the Opportunity_Database query API rather than importing the `OPPORTUNITIES` constant directly.
3. THE Opportunity_Database SHALL expose a type that is a strict superset of the existing `Opportunity` type interface (all existing properties retained with the same names, types, and optionality), so that downstream components (roadmap cards, detail views, cascade fields) require no changes.
4. WHEN the migration is complete, THE application SHALL export the `OPPORTUNITIES` constant from the Opportunity_Database module for any remaining direct consumers, returning the same array shape and values as the original module so that existing import paths produce identical results.
5. IF the Opportunity_Database is unreachable or returns an error during a read operation, THEN THE Roadmap_Engine SHALL fall back to the static `OPPORTUNITIES` array and continue serving data without user-visible interruption.
6. WHEN a new version of the application is deployed with the Opportunity_Database active, THE build process SHALL verify that the count of records in the Opportunity_Database is greater than or equal to the count of entries in the original `OPPORTUNITIES` array, failing the build if the database contains fewer records.

---

### Requirement 9: Tagging and Metadata Enrichment

**User Story:** As a student, I want opportunities tagged with relevant skills, industries, and year levels, so that I can find programs aligned with my background even if I do not know the exact name.

#### Acceptance Criteria

1. THE Opportunity_Database SHALL support a tags field on each Opportunity_Record containing zero or more free-text tags (e.g., "wet-lab", "quantitative", "first-gen", "no-GPA-minimum"), with each tag limited to a maximum of 50 characters and a maximum of 20 tags per record.
2. WHEN a student filters by a single tag, THE Search_Index SHALL return all records whose tags array contains the selected tag using case-insensitive exact match.
3. WHEN a student filters by multiple tags simultaneously, THE Search_Index SHALL return all records whose tags array contains at least one of the selected tags (OR logic).
4. THE Opportunity_Database SHALL support a year_relevance field containing zero or more values from the set ["Freshman", "Sophomore", "Junior", "Senior", "Graduate"] indicating which academic years the opportunity is relevant for.
5. WHEN a student's academic year is known and results are returned, THE Search_Index SHALL rank records whose year_relevance includes the student's year higher in the result list than records whose year_relevance does not include the student's year or is empty.
6. THE Opportunity_Database SHALL support a region field containing one or more values (e.g., "Southwest", "Northeast", "National") enabling geographic filtering when a school is not directly matched.
7. IF a student applies a tag, year, or region filter and no records match the filter criteria, THEN THE Search_Index SHALL return an empty result set and indicate that no matching opportunities were found.

---

### Requirement 10: Staleness Detection and Deadline Management

**User Story:** As a student, I want to be warned when an opportunity's deadline has passed or its information may be outdated, so that I do not waste effort on expired programs.

#### Acceptance Criteria

1. WHEN an Opportunity_Record's deadline is in the past relative to today's date, THE Opportunity_Browser SHALL display the record with a visually distinct "Deadline passed" label and reduced visual emphasis compared to active records, rather than hiding the record entirely.
2. THE Opportunity_Database SHALL include a `last_verified` date on each record indicating when the information was last confirmed accurate.
3. IF a record's `last_verified` date is older than 6 months or is absent, THEN THE Opportunity_Browser SHALL display a "May be outdated" indicator alongside the record.
4. WHEN sorting by deadline, THE Search_Index SHALL place records with passed deadlines after all records with future deadlines, and SHALL place records with no deadline after records with future deadlines but before records with passed deadlines.
5. THE Opportunity_Database SHALL support a `recurring` boolean field indicating whether the opportunity recurs annually.
6. WHEN a recurring Opportunity_Record's deadline is in the past, THE Opportunity_Browser SHALL display an "Estimated next cycle" label showing the original deadline date advanced forward by one year from the most recent passed deadline.
7. IF a record's deadline is in the past and the record is non-recurring, THEN THE Opportunity_Browser SHALL allow the user to filter out such records from search results while retaining them visible by default.
