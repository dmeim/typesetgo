# Feature: Content Management

## 1. Overview
System for managing wordlists, passages, and content packs. Supports internal curated content, teacher-created content, and community sharing.

## 2. Content Types
* **Wordlists**: Lists of words for "Word Mode". Can be themed (e.g., "Common 100", "Legal Terms", "Java Keywords").
* **Passages**: Fixed texts for "Text Mode". Metadata: Title, Author, Source, Difficulty.

## 3. Content Packs
* **Definition**: A bundle of content (wordlists/passages) + metadata.
* **Discovery**:
    * **Public Library**: Curated packs (e.g., "Famous Speeches", "STEM Terms").
    * **Search**: Filter by difficulty, language, tags.
* **Remixing**: Teachers can "clone" a pack to their library and edit it.

## 4. User-Generated Content
* **Teacher Uploads**: Teachers can upload custom text.
* **Visibility**:
    * `Private`: Only for the teacher.
    * `Class`: Visible to enrolled students.
    * `Public`: Submitted to community library (requires moderation).

## 5. Moderation Pipeline
* **Submission**: Public submissions enter a "Pending" queue.
* **Review**: Staff/Admins approve or reject.
* **Flagging**: Automated checks for profanity/PII.
