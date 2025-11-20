# Feature: Organization & Administration

## 1. Overview
Enterprise-level features for schools and districts to manage users and data at scale.

## 2. Organization Model
* **Org Entity**: Represents a school or district.
* **Domains**: Verified email domains (e.g., `@school.edu`).
* **Domain Enforcement**: Option to restrict class joins to org domains.

## 3. Roster Automation
* **CSV Import**:
    * Bulk import students and classes.
    * Schema: `student_name`, `email`, `class_name`, `grade`.
    * Validation: Check for duplicates, invalid emails.
* **Bulk Invite**: Send emails with join codes to imported users.

## 4. Admin Dashboard
* **Overview**: Usage stats across the org (active classes, total minutes typed).
* **User Management**: List all teachers and students. Reset passwords, deactivate accounts.
* **Audit Logs**: Track critical actions (imports, policy changes, deletions).

## 5. Compliance
* **Data Retention**: Configurable policies for how long student data is kept.
* **Privacy**: Tools to handle "Right to be Forgotten" requests (GDPR/FERPA compliance).
