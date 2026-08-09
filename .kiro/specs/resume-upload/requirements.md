# Requirements Document

## Introduction

This feature enables users to upload a resume file (PDF, TXT, or DOCX) within the "Tell Sylo more about you" section on both the roadmap-builder and profile pages. The uploaded file is parsed server-side using Claude to extract structured profile data, which auto-fills the existing profile context fields. The file is not stored — only the extracted text fields are retained.

## Glossary

- **Upload_Component**: The file upload UI element rendered in the "Tell Sylo more about you" section on the roadmap-builder and profile pages.
- **Resume_Parser**: The server function (`createServerFn`) that receives a resume file, extracts text content, and sends it to Claude for structured data extraction.
- **Profile_Store**: The client-side state store (`wayfind-store`) that holds the user's Profile data including experience, skills, priorWork, clubs, and alreadyDone fields.
- **Claude_Client**: The server-side Anthropic SDK client used to parse extracted resume text into structured profile fields.
- **Profile_Fields**: The set of fields that can be auto-filled from a resume: experience, skills, priorWork, clubs, and alreadyDone.

## Requirements

### Requirement 1: File Upload Trigger

**User Story:** As a student, I want to upload my resume so that my profile fields are automatically filled in without manual typing.

#### Acceptance Criteria

1. THE Upload_Component SHALL render a file upload control within the "Tell Sylo more about you" section on the roadmap-builder page.
2. THE Upload_Component SHALL render a file upload control within the "Tell Sylo more about you" section on the profile page.
3. THE Upload_Component SHALL accept files with extensions .pdf, .txt, and .docx.
4. WHEN a user selects a file via the Upload_Component, THE Upload_Component SHALL initiate the upload and parsing flow without requiring a separate submit action.

### Requirement 2: File Validation

**User Story:** As a student, I want to receive clear feedback when my uploaded file is invalid so that I can correct the issue.

#### Acceptance Criteria

1. WHEN a user selects a file with an extension other than .pdf, .txt, or .docx, THE Upload_Component SHALL display an error message indicating the accepted file types.
2. WHEN a user selects a file larger than 5 MB, THE Upload_Component SHALL display an error message indicating the maximum allowed file size.
3. THE Upload_Component SHALL perform file type and file size validation on the client side before sending the file to the server.
4. IF the file fails client-side validation, THEN THE Upload_Component SHALL prevent the file from being sent to the Resume_Parser.

### Requirement 3: Upload Progress and Processing State

**User Story:** As a student, I want to see progress indicators during upload and parsing so that I know the system is working.

#### Acceptance Criteria

1. WHILE the file is being uploaded to the Resume_Parser, THE Upload_Component SHALL display a loading indicator with a label such as "Uploading resume...".
2. WHILE the Resume_Parser is extracting and parsing the resume content, THE Upload_Component SHALL display a processing indicator with a label such as "Analyzing your resume...".
3. WHEN parsing completes successfully, THE Upload_Component SHALL display a success message indicating the profile fields have been populated.

### Requirement 4: Server-Side Text Extraction

**User Story:** As a system operator, I want resume text extraction to happen on the server so that sensitive file processing does not occur in the browser.

#### Acceptance Criteria

1. THE Resume_Parser SHALL be implemented as a `createServerFn` server function.
2. WHEN the Resume_Parser receives a PDF file, THE Resume_Parser SHALL extract the text content from the PDF.
3. WHEN the Resume_Parser receives a TXT file, THE Resume_Parser SHALL read the file content as plain text.
4. WHEN the Resume_Parser receives a DOCX file, THE Resume_Parser SHALL extract the text content from the document.
5. THE Resume_Parser SHALL validate that the received file does not exceed 5 MB before processing.
6. IF text extraction fails, THEN THE Resume_Parser SHALL return an error response with a descriptive message.

### Requirement 5: Claude-Powered Resume Parsing

**User Story:** As a student, I want my resume content to be intelligently parsed into structured fields so that the auto-fill is accurate and relevant.

#### Acceptance Criteria

1. WHEN the Resume_Parser has extracted text from the uploaded file, THE Resume_Parser SHALL send the extracted text to the Claude_Client for structured parsing.
2. THE Resume_Parser SHALL instruct the Claude_Client to extract data matching the Profile_Fields: experience, skills, priorWork, clubs, and alreadyDone.
3. THE Resume_Parser SHALL return the parsed data as a JSON object with keys matching the Profile_Fields.
4. THE Resume_Parser SHALL use Zod schema validation on the Claude_Client response to ensure the returned data conforms to the expected structure.
5. IF the Claude_Client fails to respond or returns an unparseable response, THEN THE Resume_Parser SHALL return an error response indicating parsing failure.

### Requirement 6: Profile Field Auto-Fill

**User Story:** As a student, I want my profile fields to be automatically populated from my resume so that I save time during onboarding.

#### Acceptance Criteria

1. WHEN the Resume_Parser returns parsed profile data successfully, THE Profile_Store SHALL update each Profile_Field with the corresponding parsed value.
2. THE Profile_Store SHALL only overwrite Profile_Fields that have non-empty parsed values from the resume.
3. WHEN the Profile_Store updates fields from resume data, THE Upload_Component SHALL visually indicate which fields were auto-filled.

### Requirement 7: Post-Upload Editing

**User Story:** As a student, I want to review and edit the auto-filled fields after upload so that I can correct any parsing inaccuracies.

#### Acceptance Criteria

1. AFTER the Profile_Store has been updated with parsed resume data, THE Profile_Fields SHALL remain fully editable by the user.
2. THE Upload_Component SHALL not lock or disable any Profile_Fields after auto-fill.
3. WHEN a user modifies an auto-filled Profile_Field, THE Profile_Store SHALL retain the user's manual edits.

### Requirement 8: Error Handling

**User Story:** As a student, I want clear error messages when something goes wrong during upload or parsing so that I know what happened and what to do next.

#### Acceptance Criteria

1. IF the Resume_Parser returns an error response, THEN THE Upload_Component SHALL display the error message to the user.
2. IF a network error occurs during upload, THEN THE Upload_Component SHALL display a message indicating the upload could not be completed and suggest retrying.
3. WHEN an error occurs, THE Upload_Component SHALL allow the user to attempt another upload without refreshing the page.
4. IF an error occurs, THEN THE Profile_Store SHALL retain any previously entered profile data without modification.

### Requirement 9: File Disposal

**User Story:** As a system operator, I want uploaded files to be discarded after parsing so that no user documents are stored on the server.

#### Acceptance Criteria

1. AFTER the Resume_Parser has completed text extraction and Claude parsing, THE Resume_Parser SHALL discard the uploaded file from server memory.
2. THE Resume_Parser SHALL not write the uploaded file to any persistent storage.
3. THE Resume_Parser SHALL only return the structured parsed text fields to the client.
